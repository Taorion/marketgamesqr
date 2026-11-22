const {createHash}=require('node:crypto');
function fixture({id='SANDBOX-001',buyer='SANDBOXBUYER001',type='Invoice',related='SANDBOX-ORIGINAL',name='Café de prueba'}={}) {
 const uuid=createHash('sha384').update(id).digest('hex'),reference=createHash('sha384').update(related).digest('hex');
 const line={Invoice:'InvoiceLine',CreditNote:'CreditNoteLine',DebitNote:'DebitNoteLine'}[type];
 const qty={Invoice:'InvoicedQuantity',CreditNote:'CreditedQuantity',DebitNote:'DebitedQuantity'}[type];
 const total=type==='DebitNote'?'RequestedMonetaryTotal':'LegalMonetaryTotal';
 return `<?xml version="1.0" encoding="UTF-8"?>
<${type} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${type}-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
 <cbc:ID>${id}</cbc:ID><cbc:UUID>${uuid}</cbc:UUID><cbc:IssueDate>2026-11-22</cbc:IssueDate><cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
 ${type==='Invoice'?'':`<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${related}</cbc:ID><cbc:UUID>${reference}</cbc:UUID></cac:InvoiceDocumentReference></cac:BillingReference>`}
 <cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme><cbc:RegistrationName>Comercio de prueba Qori</cbc:RegistrationName><cbc:CompanyID schemeName="31">900000000</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingSupplierParty>
 <cac:AccountingCustomerParty><cac:Party><cac:PartyTaxScheme><cbc:RegistrationName>Consumidor sintético</cbc:RegistrationName><cbc:CompanyID schemeName="13">${buyer}</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingCustomerParty>
 <cac:PaymentMeans><cbc:PaymentMeansCode>10</cbc:PaymentMeansCode></cac:PaymentMeans>
 <cac:TaxTotal><cbc:TaxAmount currencyID="COP">3800.00</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="COP">20000.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="COP">3800.00</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>19.00</cbc:Percent><cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
 <cac:${total}><cbc:LineExtensionAmount currencyID="COP">20000.00</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="COP">20000.00</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="COP">23800.00</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="COP">23800.00</cbc:PayableAmount></cac:${total}>
 <cac:${line}><cbc:ID>1</cbc:ID><cbc:${qty} unitCode="94">2</cbc:${qty}><cbc:LineExtensionAmount currencyID="COP">20000.00</cbc:LineExtensionAmount><cac:Item><cbc:Name>${name}</cbc:Name></cac:Item><cac:Price><cbc:PriceAmount currencyID="COP">10000.00</cbc:PriceAmount></cac:Price></cac:${line}>
</${type}>`;
}
module.exports={fixture};

