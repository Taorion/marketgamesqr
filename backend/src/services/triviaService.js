const QRCode = require("qrcode");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createSecureToken } = require("../utils/token");
const { logQrEvent } = require("./auditService");
const { consumeQrCredit, ensureCreditAccount, mapPublicCreditAccount } = require("./qrCreditService");
const { registerActivityQrInCollector } = require("./rmsCollectorIntakeService");

function publicAppBaseUrl() {
  try {
    const parsed = new URL(env.publicAppUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "http://localhost:3000";
  }
}

function buildValidatorUrl(token) {
  const target = new URL("/empresa/", publicAppBaseUrl());
  target.searchParams.set("view", "validator");
  target.searchParams.set("token", token);
  return target.toString();
}

function buildTriviaUrl(slug) {
  return new URL(`/trivia/${encodeURIComponent(slug)}`, publicAppBaseUrl()).toString();
}

function slugify(value) {
  return String(value || "trivia")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "trivia";
}

function resolveExpiration(body) {
  if (body.expires_mode === "CUSTOM_DATE" && body.expires_at) {
    return body.expires_at;
  }
  if (body.expiration_days) {
    return new Date(Date.now() + Number(body.expiration_days) * 24 * 60 * 60 * 1000).toISOString();
  }
  const presets = {
    "7_DAYS": 7,
    "15_DAYS": 15,
    "30_DAYS": 30,
  };
  const days = presets[body.expires_mode];
  return days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
}

function activationTypeFor(rowOrBody = {}) {
  return rowOrBody.activation_type || rowOrBody.metadata?.activation_type || "TRIVIA";
}

function normalizeQuestions(questions = []) {
  return questions.map((item, index) => ({
    id: `q${index + 1}`,
    question: item.question,
    options: {
      A: item.options.A,
      B: item.options.B,
      C: item.options.C,
      D: item.options.D,
    },
    correct_answer: item.correct_answer,
  }));
}

function normalizeSurveyQuestions(questions = []) {
  return questions.map((item, index) => ({
    id: item.id || `s${index + 1}`,
    question: item.question,
    type: item.type,
    options: item.options || [],
    required: item.required !== false,
  }));
}

function normalizeActivationConfig(body) {
  const type = activationTypeFor(body);
  const base = {
    activation_type: type,
    open_question: body.open_question || null,
    survey_questions: normalizeSurveyQuestions(body.survey_questions || []),
    reveal_cards: body.reveal_cards || [],
    spin_rewards: body.spin_rewards || body.reveal_cards || [],
    thermometer_discounts: body.thermometer_discounts || [],
  };
  if (type === "TRIVIA") {
    base.questions = normalizeQuestions(body.questions || []);
  }
  return base;
}

function publicQuestions(questions) {
  return (questions || []).map((item) => ({
    id: item.id,
    question: item.question,
    options: item.options,
  }));
}

function scoreTrivia(questions = [], answers) {
  const normalizedAnswers = answers || {};
  const score = questions.reduce((total, question) => (
    String(normalizedAnswers[question.id] || "").toUpperCase() === question.correct_answer ? total + 1 : total
  ), 0);
  return {
    score,
    total: questions.length,
    passed: score === questions.length,
  };
}

function hasActivationAnswer(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return String(value || "").trim().length > 0;
}

function evaluateActivation(trivia, answers = {}) {
  const type = activationTypeFor(trivia);
  if (type === "TRIVIA") {
    return scoreTrivia(trivia.questions || [], answers);
  }
  if (type === "OPEN_QUESTION") {
    const passed = hasActivationAnswer(answers.open_question);
    return { score: passed ? 1 : 0, total: 1, passed };
  }
  if (type === "SPIN_DISCOVER") {
    const passed = hasActivationAnswer(answers.selected_card);
    return { score: passed ? 1 : 0, total: 1, passed };
  }
  if (type === "THERMOMETER") {
    const passed = hasActivationAnswer(answers.thermometer);
    return { score: passed ? 1 : 0, total: 1, passed };
  }
  if (type === "SURVEY") {
    const questions = trivia.metadata?.activation_config?.survey_questions || [];
    const required = questions.filter((question) => question.required !== false);
    const answered = required.filter((question) => hasActivationAnswer(answers[question.id])).length;
    const total = required.length || 1;
    return {
      score: answered,
      total,
      passed: answered === total,
    };
  }
  const total = type === "SURVEY"
    ? Number(trivia.metadata?.activation_config?.survey_questions?.length || 1)
    : 1;
  return {
    score: total,
    total,
    passed: true,
  };
}

function selectedBenefitFromAttempt(trivia, body = {}) {
  const metadata = body.metadata || {};
  const selected = metadata.selected_benefit && typeof metadata.selected_benefit === "object"
    ? metadata.selected_benefit
    : {};
  const baseValue = trivia.benefit_value || {};
  return {
    benefit_type: selected.benefit_type || trivia.benefit_type,
    benefit_value: {
      ...baseValue,
      ...(selected.benefit_value || {}),
      label: selected.benefit_label || selected.label || baseValue.label || "Beneficio de activacion",
      selected_discount: metadata.selected_discount ?? selected.selected_discount ?? baseValue.selected_discount ?? null,
    },
  };
}

async function assertCampaign(client, businessId, campaignId) {
  if (!campaignId) {
    return null;
  }
  const result = await client.query(
    `select id, name, game_id, reward_id, status, starts_at, ends_at
     from campaigns
     where id = $1 and business_id = $2`,
    [campaignId, businessId]
  );
  const campaign = result.rows[0];
  if (!campaign) {
    throw badRequest("La campana seleccionada no existe para este negocio.");
  }
  return campaign;
}

async function defaultGameId(client, businessId, campaign = null) {
  if (campaign?.game_id) {
    return campaign.game_id;
  }
  const result = await client.query(
    `select id
     from games
     where business_id = $1 and is_active = true
     order by created_at asc
     limit 1`,
    [businessId]
  );
  return result.rows[0]?.id || null;
}

function mapTrivia(row) {
  const publicUrl = buildTriviaUrl(row.public_slug);
  const metadata = row.metadata || {};
  const activationType = activationTypeFor(row);
  const activationConfig = metadata.activation_config || {};
  return {
    id: row.id,
    business_id: row.business_id,
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name || null,
    title: row.title,
    description: row.description,
    public_slug: row.public_slug,
    public_url: publicUrl,
    activation_type: activationType,
    activation_config: {
      activation_type: activationType,
      open_question: activationConfig.open_question || null,
      survey_questions: activationConfig.survey_questions || [],
      reveal_cards: activationConfig.reveal_cards || [],
      spin_rewards: activationConfig.spin_rewards || [],
      thermometer_discounts: activationConfig.thermometer_discounts || [],
    },
    questions: publicQuestions(row.questions || []),
    question_count: Array.isArray(row.questions) ? row.questions.length : Number(row.question_count || 0),
    benefit_type: row.benefit_type,
    benefit_value: row.benefit_value || {},
    expires_at: row.expires_at,
    max_winners: row.max_winners,
    status: row.status,
    attempts_count: Number(row.attempts_count || 0),
    winners_count: Number(row.winners_count || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createTriviaLauncher(businessId, user, body) {
  return withTransaction(async (client) => {
    const campaign = await assertCampaign(client, businessId, body.campaign_id || null);
    const activationConfig = normalizeActivationConfig(body);
    const questions = activationConfig.questions || [];
    const publicSlug = `${slugify(body.title)}-${createSecureToken().slice(0, 8).toLowerCase()}`;
    const benefitValue = {
      ...(body.benefit.benefit_value || {}),
      label: body.benefit.benefit_label,
    };
    const expiresAt = resolveExpiration(body);

    const result = await client.query(
      `insert into business_trivias
        (business_id, campaign_id, created_by_user_id, title, public_slug, description,
         questions, benefit_type, benefit_value, expires_at, max_winners, status, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE', $12)
       returning *`,
      [
        businessId,
        body.campaign_id || null,
        user.id,
        body.title,
        publicSlug,
        body.description || null,
        JSON.stringify(questions),
        body.benefit.benefit_type,
        benefitValue,
        expiresAt,
        body.max_winners || null,
        {
          ...(body.metadata || {}),
          activation_type: activationConfig.activation_type,
          activation_config: activationConfig,
          qr_creation_context: "trivia_launcher",
          campaign_id: body.campaign_id || null,
        },
      ]
    );
    const trivia = result.rows[0];
    const publicUrl = buildTriviaUrl(trivia.public_slug);

    if (campaign) {
      await client.query(
        `update campaigns
         set delivered_assets = coalesce(delivered_assets, '{}'::jsonb)
           || jsonb_build_object('trivia_launcher_url', $2::text, 'trivia_launcher_id', $3::text)
         where id = $1`,
        [campaign.id, publicUrl, trivia.id]
      );
    }

    const account = await ensureCreditAccount(client, businessId);
    return {
      trivia: mapTrivia({ ...trivia, campaign_name: campaign?.name || null }),
      credit_account: mapPublicCreditAccount(account),
    };
  });
}

async function listTriviaLaunchers(businessId) {
  const result = await query(
    `select
       t.*,
       c.name as campaign_name,
       count(a.id)::int as attempts_count,
       count(a.id) filter (where a.passed)::int as winners_count
     from business_trivias t
     left join campaigns c on c.id = t.campaign_id
     left join business_trivia_attempts a on a.trivia_id = t.id
     where t.business_id = $1
     group by t.id, c.name
     order by t.created_at desc
     limit 100`,
    [businessId]
  );
  return result.rows.map(mapTrivia);
}

async function getPublicTrivia(slug) {
  const result = await query(
    `select
       t.*,
       b.name as business_name,
       b.slug as business_slug,
       c.name as campaign_name,
       count(a.id)::int as attempts_count,
       count(a.id) filter (where a.passed)::int as winners_count
     from business_trivias t
     join businesses b on b.id = t.business_id
     left join campaigns c on c.id = t.campaign_id
     left join business_trivia_attempts a on a.trivia_id = t.id
     where t.public_slug = $1 and b.is_active = true
     group by t.id, b.id, c.name`,
    [slug]
  );
  const trivia = result.rows[0];
  if (!trivia) {
    throw notFound("Trivia no encontrada.");
  }
  const now = new Date();
  const active = trivia.status === "ACTIVE" && (!trivia.expires_at || new Date(trivia.expires_at) > now);
  return {
    ...mapTrivia(trivia),
    active,
    business: {
      name: trivia.business_name,
      slug: trivia.business_slug,
    },
  };
}

async function submitPublicTrivia(slug, body) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `select
         t.*,
         b.name as business_name,
         b.slug as business_slug,
         c.name as campaign_name,
         coalesce(c.game_id, g.id) as game_id,
         c.reward_id as campaign_reward_id
       from business_trivias t
       join businesses b on b.id = t.business_id
       left join campaigns c on c.id = t.campaign_id
       left join lateral (
         select id
         from games
         where business_id = t.business_id and is_active = true
         order by created_at asc
         limit 1
       ) g on true
       where t.public_slug = $1 and b.is_active = true
       for update of t`,
      [slug]
    );
    const trivia = result.rows[0];
    if (!trivia) {
      throw notFound("Activacion no encontrada.");
    }
    if (trivia.status !== "ACTIVE") {
      throw badRequest("Esta activacion no esta activa.");
    }
    if (trivia.expires_at && new Date(trivia.expires_at) <= new Date()) {
      throw badRequest("Esta activacion ya finalizo.");
    }
    const activationType = activationTypeFor(trivia);

    const participantKey = [
      body.document_id ? `document:${body.document_id}` : "",
      body.email ? `email:${body.email.toLowerCase()}` : "",
      body.phone ? `phone:${body.phone}` : "",
    ].filter(Boolean);
    if (participantKey.length) {
      const duplicate = await client.query(
        `select id, passed
         from business_trivia_attempts
         where trivia_id = $1
           and (
             ($2::text is not null and participant_document_id = $2)
             or ($3::text is not null and lower(participant_email) = lower($3))
             or ($4::text is not null and participant_phone = $4)
           )
         order by created_at asc
         limit 1`,
        [trivia.id, body.document_id || null, body.email || null, body.phone || null]
      );
      if (duplicate.rowCount) {
        throw badRequest("Esta persona ya participo en esta activacion.");
      }
    }

    const questions = trivia.questions || [];
    const score = evaluateActivation(trivia, body.answers);
    if (score.passed && trivia.max_winners) {
      const winners = await client.query(
        "select count(*)::int as total from business_trivia_attempts where trivia_id = $1 and passed = true",
        [trivia.id]
      );
      if (Number(winners.rows[0]?.total || 0) >= Number(trivia.max_winners)) {
        throw badRequest("Esta activacion ya entrego todos los tickets disponibles.");
      }
    }

    const gameId = trivia.game_id || await defaultGameId(client, trivia.business_id);
    const playerResult = await client.query(
      `insert into players (business_id, campaign_id, game_id, name, email, phone, document_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        trivia.business_id,
        trivia.campaign_id || null,
        gameId,
        body.name,
        body.email || null,
        body.phone || null,
        body.document_id || null,
        {
          source: "trivia_launcher",
          activation_type: activationType,
          trivia_id: trivia.id,
          trivia_title: trivia.title,
          score: score.score,
          total_questions: score.total,
          passed: score.passed,
          ...(body.metadata || {}),
        },
      ]
    );
    const player = playerResult.rows[0];

    const questionnaireResult = await client.query(
      `insert into questionnaires (business_id, campaign_id, game_id, player_id, answers)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [
        trivia.business_id,
        trivia.campaign_id || null,
        gameId,
        player.id,
        {
          trivia_id: trivia.id,
          trivia_title: trivia.title,
          activation_type: activationType,
          answers: body.answers,
          score: score.score,
          total_questions: score.total,
          passed: score.passed,
        },
      ]
    );
    const questionnaire = questionnaireResult.rows[0];

    let qr = null;
    let validatorUrl = null;
    if (score.passed) {
      const token = createSecureToken();
      validatorUrl = buildValidatorUrl(token);
      const selectedBenefit = selectedBenefitFromAttempt(trivia, body);
      const qrResult = await client.query(
        `insert into qr_codes
          (business_id, campaign_id, game_id, player_id, reward_id, questionnaire_id, token,
           status, metadata, expires_at, origin_type, benefit_type, benefit_value, claim_required, claimed_at, claimed_by_player_id)
         values ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9, 'TRIVIA_LAUNCHER', $10, $11, false, now(), $4)
         returning *`,
        [
          trivia.business_id,
          trivia.campaign_id || null,
          gameId,
          player.id,
          trivia.campaign_reward_id || null,
          questionnaire.id,
          token,
          {
            source: "trivia_launcher",
            trivia_id: trivia.id,
            trivia_title: trivia.title,
            activation_type: activationType,
            campaign_id: trivia.campaign_id || null,
            score: score.score,
            total_questions: score.total,
            selected_benefit: selectedBenefit.benefit_value,
            qr_creation_context: "public_trivia_winner",
          },
          trivia.expires_at || null,
          selectedBenefit.benefit_type,
          selectedBenefit.benefit_value,
        ]
      );
      qr = qrResult.rows[0];
      await registerActivityQrInCollector(client, {
        business_id: trivia.business_id,
        source_type: "PLAYER",
        source_id: player.id,
        lead_id: player.id,
        player_id: player.id,
        qr_code_id: qr.id,
        campaign_id: trivia.campaign_id || null,
        activation_id: trivia.id,
        activation_type: activationType,
        activation_name: trivia.title || null,
      });
      await consumeQrCredit(client, trivia.business_id, qr.id, null);
      await logQrEvent(client, {
        business_id: trivia.business_id,
        campaign_id: trivia.campaign_id || null,
        qr_code_id: qr.id,
        player_id: player.id,
        event_type: "TRIVIA_QR_ISSUED",
        message: "Trivia winner QR issued.",
        metadata: {
          trivia_id: trivia.id,
          activation_type: activationType,
          score: score.score,
          total_questions: score.total,
        },
      });
    }

    const attemptResult = await client.query(
      `insert into business_trivia_attempts
        (trivia_id, business_id, campaign_id, player_id, questionnaire_id, qr_code_id,
         participant_name, participant_phone, participant_email, participant_document_id,
         answers, score, total_questions, passed, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       returning *`,
      [
        trivia.id,
        trivia.business_id,
        trivia.campaign_id || null,
        player.id,
        questionnaire.id,
        qr?.id || null,
        body.name,
        body.phone || null,
        body.email || null,
        body.document_id || null,
        body.answers,
        score.score,
        score.total,
        score.passed,
        {
          source: "trivia_launcher",
          activation_type: activationType,
          participant_key: participantKey,
          ...(body.metadata || {}),
        },
      ]
    );

    return {
      attempt: {
        id: attemptResult.rows[0].id,
        score: score.score,
        total_questions: score.total,
        passed: score.passed,
      },
      message: score.passed
        ? (activationType === "TRIVIA"
          ? "Respuesta correcta. Tu ticket esta listo para redimir en tienda."
          : "Activacion completada. Tu ticket esta listo para redimir en tienda.")
        : "No alcanzaste el puntaje para recibir ticket.",
      qr_code: qr ? {
        id: qr.id,
        status: qr.status,
        created_at: qr.created_at,
        expires_at: qr.expires_at,
      } : null,
      validator_url: validatorUrl,
      qr_image_data_url: validatorUrl ? await QRCode.toDataURL(validatorUrl) : null,
    };
  });
}

module.exports = {
  createTriviaLauncher,
  listTriviaLaunchers,
  getPublicTrivia,
  submitPublicTrivia,
};
