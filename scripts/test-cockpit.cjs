const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Filter {
    constructor(path, operator, value1, value2) {
        Object.assign(this, typeof path === 'object' ? path : {path, operator, value1, value2});
    }
}
let controller;
const formatterProxy = {};
vm.runInNewContext(fs.readFileSync('webapp/controller/zfi_csp_kokpit.controller.js', 'utf8'), {
    sap: {ui: {define: (deps, factory) => {
        controller = factory({extend: (name, methods) => methods}, null, Filter,
            {EQ:'eq',NE:'ne',BT:'bt',LE:'le',Any:'any'}, function () {}, {}, {}, formatterProxy);
    }}}, BigInt
});
const values = {company:'1100', flow:'9007199254740993', form:'9007199254740999', person:''};
let selected = ['B', 'H'], deleted = false;
controller.byId = id => ({
    getValue: () => values[id] || '', getSelectedKey: () => '',
    getSelectedKeys: () => selected, getSelected: () => deleted,
    getDateValue: () => null, getSecondDateValue: () => null
});
function flatten(filters) { return filters.flatMap(f => [f, ...flatten(f.filters || []), ...(f.condition ? [f.condition] : [])]); }
for (const key of ['A','M','E','R']) {
    const filters = flatten(controller._filters(key));
    const prefix = ['E','R'].includes(key) ? '_Header/' : '';
    assert(filters.some(f => f.path === prefix + 'SirketKodu' && f.value1 === '1100'));
    assert(filters.some(f => f.path === prefix + 'AkisNumarasi' && f.operator === 'eq' && f.value1 === '9007199254740993'));
    assert(filters.some(f => f.path === prefix + 'FormNumarasi' && f.operator === 'eq' && f.value1 === '9007199254740999'));
    assert(filters.some(f => f.operator === 'ne' && f.value1 === 'S'));
}
assert(flatten(controller._filters('M')).some(f => f.path === '_Item' && f.operator === 'any'));
assert(flatten(controller._filters('E')).some(f => f.path === '_Header/SurecTipi' && f.value1 === 'M'));
assert(flatten(controller._filters('R')).some(f => f.path === '_Header/Durum'));
assert(flatten(controller._filters('R')).some(f => f.path === 'KalemDurum'));
selected = ['S']; deleted = true;
assert(!flatten(controller._filters('E')).some(f => f.operator === 'ne' && f.value1 === 'S'));
assert(flatten(controller._filters('E')).some(f => f.path === 'KalemDurum' && f.value1 === 'S'));
let formatter;
vm.runInNewContext(fs.readFileSync('webapp/model/formatter.js','utf8'), {sap:{ui:{define:(deps, factory) => {formatter = factory();}}}});
assert.equal(formatter.status('T'), 'Ters kaydedildi');
assert.equal(formatter.status('B'), 'Bekliyor');
assert.equal(formatter.itemStatus('', '', 'M'), 'Muhasebeleşti');
assert.equal(formatter.itemStatus('X', 'V', 'M'), 'Virman yapıldı');
assert.equal(formatter.itemState('X', 2, 3), 'Warning');
assert.equal(formatter.kind(8), 'Diğer (8)');
assert.equal(formatter.kind(1), '1 · İş avansı');
assert.equal(formatter.kind(null), 'Tanımsız');
assert.equal(formatter.kind(undefined), 'Tanımsız');
assert.equal(formatter.kind(0), 'Diğer (0)');
assert.equal(formatter.area('0'), '0 · Yurtiçi');
Object.assign(formatterProxy, formatter);
const header = {SirketKodu:'1100', SurecTipi:'M', AvansTuru:3, Durum:'M', HataMesaji:'başlık', TersBelge:'100', TersYil:'2025', AvansFormNumarasi:'9007199254740999'};
const normal = controller._exportRow({OrderId:1, AkisNumarasi:'9007199254740993', Zcheck:'', KalemDurum:'', Tutar:'12345678901234567890.12', _Header:header});
assert.equal(normal.Durum, 'M');
assert.equal(normal.TersBelge, '100');
assert.equal(normal.HataMesaji, 'başlık');
assert.equal(normal.AvansFormNumarasi, '9007199254740999');
assert.equal(normal.Tutar, '12345678901234567890.12');
assert.equal(normal.Surec, 'M');
const invoice = controller._exportRow({OrderId:2, Zcheck:'X', KalemDurum:'V', HataMesaji:'kalem', TersBelge:'200', TersYil:'2026', _Header:header});
assert.equal(invoice.Surec, 'E');
assert.equal(invoice.Durum, 'V');
assert.equal(invoice.TersBelge, '200');
assert.equal(invoice.HataMesaji, 'kalem');
assert.equal(formatter.itemValue('', '', 'Başlık hatası'), 'Başlık hatası');
assert.equal(formatter.itemValue('X', 'Fatura hatası', 'Başlık hatası'), 'Fatura hatası');
const detailHeader = {SirketKodu:'1100', SurecTipi:'M'};
const mixedFilters = controller._detailFilters({AkisNumarasi:'9007199254740993'}, detailHeader);
assert(mixedFilters.some(f => f.path === '_Header/SirketKodu' && f.value1 === '1100'));
assert(mixedFilters.some(f => f.path === 'Zcheck' && f.operator === 'ne' && f.value1 === 'X'));
const invoiceFilters = controller._detailFilters({AkisNumarasi:'9007199254740993', OrderId:1, Zcheck:'X', FaturaId:'INV-1'}, detailHeader);
assert(invoiceFilters.some(f => f.path === 'FaturaId' && f.value1 === 'INV-1'));
assert(invoiceFilters.some(f => f.path === 'Zcheck' && f.operator === 'eq' && f.value1 === 'X'));
assert.equal(controller._detailMessages({SAP__Messages:[{message:'Kalem'}, {message:'Ortak'}]}, {SAP__Messages:[{message:'Başlık'}, {message:'Ortak'}]}), 'Başlık\nOrtak\nKalem');
console.log('PASS: four tabs, company/header filters, Int64 ranges, mixed forms, deleted status, criticality and unknown expense type');
