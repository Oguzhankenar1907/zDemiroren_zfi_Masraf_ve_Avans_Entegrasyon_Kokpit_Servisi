sap.ui.define([], function () {
    "use strict";
    const labels = { B: "Bekliyor", H: "Hatalı", M: "Muhasebeleşti", O: "Ödendi", V: "Virman yapıldı", G: "Giderleştirildi", T: "Ters kaydedildi", S: "Silme işaretli" };
    return {
        status: function (value) { return labels[value] || value || ""; },
        state: function (criticality) { return ["None", "Error", "Warning", "Success"][criticality] || "None"; },
        itemStatus: function (flag, item, header) { return labels[flag === "X" ? item : header] || (flag === "X" ? item : header) || ""; },
        itemState: function (flag, item, header) { return ["None", "Error", "Warning", "Success"][flag === "X" ? item : header] || "None"; },
        itemValue: function (flag, item, header) { return (flag === "X" ? item : header) || ""; },
        kind: function (value) {
            const label = ({1: "İş avansı", 2: "Seyahat avansı", 3: "Seyahat masrafı", 4: "Araç masrafı", 5: "Diğer masraf"})[value];
            return label ? value + " · " + label : value === null || value === undefined || value === "" ? "Tanımsız" : "Diğer (" + value + ")";
        },
        process: function (value) { return ({A: "A · Avans", M: "M · Masraf"})[value] || value || ""; },
        area: function (value) { return ({0: "0 · Yurtiçi", 1: "1 · Yurtdışı", 2: "2 · Seyahat dışı"})[value] || value || ""; },
        result: function (value) { return value === "S" ? "Başarılı" : value === "E" ? "Hatalı" : value || ""; },
        resultState: function (value) { return value === "S" ? "Success" : value === "E" ? "Error" : "None"; }
    };
});
