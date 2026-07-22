const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  awardPoints,
  createAgendaTasks,
  createSeason,
  dashboard,
  deliverReward,
  getSeason,
  leaderboardForSeason,
  listSeasons,
  pendingRewards,
  purchaseLeaderboardByPeriod,
  setSeasonStatus,
  updateSeason,
} = require("../services/gamificationMissionService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

const seasonSchema = z.object({
  template_key: z.string().trim().max(80).optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1200).optional().nullable(),
  type: z.string().trim().max(80).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "FINISHED", "CLOSED"]).optional(),
  start_date: z.string().trim().max(40).optional().nullable(),
  end_date: z.string().trim().max(40).optional().nullable(),
  channel: z.string().trim().max(120).optional().nullable(),
  frequency: z.string().trim().max(80).optional().nullable(),
  banner_url: z.string().trim().max(1000).optional().nullable(),
  target_segment: z.record(z.string(), z.unknown()).optional().default({}),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
  points_rules: z.array(z.record(z.string(), z.unknown())).optional(),
  streaks: z.array(z.record(z.string(), z.unknown())).optional(),
  rewards: z.array(z.record(z.string(), z.unknown())).optional(),
  agenda_tasks: z.array(z.record(z.string(), z.unknown())).optional(),
  ranking: z.record(z.string(), z.unknown()).optional(),
});

const pointsSchema = z.object({
  season_id: z.string().uuid().optional().nullable(),
  mission_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  action_type: z.string().trim().min(2).max(100),
  points: z.number().int().min(-10000).max(10000),
  source_id: z.string().uuid().optional().nullable(),
  source_type: z.string().trim().max(80).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const agendaSchema = z.object({
  season_id: z.string().uuid().optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  tasks: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

async function getDashboard(req, res, next) {
  try {
    res.json(await dashboard(businessIdFor(req)));
  } catch (error) {
    next(error);
  }
}

async function seasons(req, res, next) {
  try {
    res.json(await listSeasons(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const body = validate(seasonSchema, req.body);
    res.status(201).json(await createSeason(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function detail(req, res, next) {
  try {
    res.json(await getSeason(businessIdFor(req), req.params.id));
  } catch (error) {
    next(error);
  }
}

async function patch(req, res, next) {
  try {
    const body = validate(seasonSchema.partial(), req.body);
    res.json(await updateSeason(businessIdFor(req), req.params.id, body));
  } catch (error) {
    next(error);
  }
}

async function activate(req, res, next) {
  try {
    res.json(await setSeasonStatus(businessIdFor(req), req.params.id, "ACTIVE"));
  } catch (error) {
    next(error);
  }
}

async function pause(req, res, next) {
  try {
    res.json(await setSeasonStatus(businessIdFor(req), req.params.id, "PAUSED"));
  } catch (error) {
    next(error);
  }
}

async function close(req, res, next) {
  try {
    res.json(await setSeasonStatus(businessIdFor(req), req.params.id, "CLOSED"));
  } catch (error) {
    next(error);
  }
}

async function award(req, res, next) {
  try {
    const body = validate(pointsSchema, req.body);
    res.status(201).json(await awardPoints(businessIdFor(req), body));
  } catch (error) {
    next(error);
  }
}

async function leaderboard(req, res, next) {
  try {
    res.json(await leaderboardForSeason(businessIdFor(req), req.params.seasonId));
  } catch (error) {
    next(error);
  }
}

async function purchaseLeaderboard(req, res, next) {
  try {
    res.json(await purchaseLeaderboardByPeriod(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function rewardsPending(req, res, next) {
  try {
    res.json(await pendingRewards(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function deliver(req, res, next) {
  try {
    res.json(await deliverReward(businessIdFor(req), req.params.id));
  } catch (error) {
    next(error);
  }
}

async function agendaTasks(req, res, next) {
  try {
    const body = validate(agendaSchema, req.body);
    res.status(201).json(await createAgendaTasks(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  activate,
  agendaTasks,
  award,
  close,
  create,
  deliver,
  detail,
  getDashboard,
  leaderboard,
  patch,
  pause,
  purchaseLeaderboard,
  rewardsPending,
  seasons,
};
