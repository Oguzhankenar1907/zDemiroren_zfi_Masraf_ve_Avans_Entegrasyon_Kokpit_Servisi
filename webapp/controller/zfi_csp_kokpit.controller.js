sap.ui.define([
    "sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator", "sap/ui/model/Sorter", "sap/m/MessageBox",
    "sap/ui/core/Fragment", "com/golive/demiroren/zficspkokpit/model/formatter"
], function (Controller, JSONModel, Filter, OP, Sorter, MessageBox, Fragment, formatter) {
    "use strict";
    return Controller.extend("com.golive.demiroren.zficspkokpit.controller.zfi_csp_kokpit", {
        formatter: formatter,
        onInit: function () {
            this.getView().setModel(new JSONModel({ connection: "Şirket seçip formları filtreleyin." }), "ui");
            this.getView().setModel(new JSONModel({ title: "", header: {}, messages: "" }), "detail");
        },
        _text: function (id) { return this.byId(id).getValue().trim(); },
        _date: function (date) {
            return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
        },
        _and: function (filters) { return new Filter({ filters: filters, and: true }); },
        _or: function (filters) { return new Filter({ filters: filters, and: false }); },
        _filters: function (key) {
            const item = key === "E" || key === "R";
            const prefix = item ? "_Header/" : "";
            const filters = [new Filter(prefix + "SirketKodu", OP.EQ, this._text("company"))];
            [ ["flow", "AkisNumarasi"], ["form", "FormNumarasi"] ].forEach(([id, field]) => {
                const value = this._text(id);
                if (value) { filters.push(new Filter(prefix + field, OP.EQ, value)); }
            });
            if (this._text("person")) { filters.push(new Filter(prefix + "Tckn", OP.EQ, this._text("person"))); }
            const area = this.byId("area").getSelectedKey();
            if (area !== "") { filters.push(new Filter(prefix + "YurticiYurtdisi", OP.EQ, area)); }
            const dates = this.byId("dates"), from = dates.getDateValue(), to = dates.getSecondDateValue() || from;
            if (from) { filters.push(new Filter(prefix + "BelgeTarihi", OP.BT, this._date(from), this._date(to))); }
            const statuses = this.byId("statuses").getSelectedKeys();
            const deleted = this.byId("deleted").getSelected();
            const statusFilter = (path) => {
                const parts = [];
                if (statuses.length) { parts.push(this._or(statuses.map(s => new Filter(path, OP.EQ, s)))); }
                if (!deleted) { parts.push(new Filter(path, OP.NE, "S")); }
                return parts;
            };
            if (key === "A" || key === "M") {
                filters.push(new Filter("SurecTipi", OP.EQ, key), ...statusFilter("Durum"));
                if (key === "M") {
                    filters.push(new Filter({ path: "_Item", operator: OP.Any, variable: "i", condition: new Filter("i/Zcheck", OP.NE, "X") }));
                }
            } else if (key === "E") {
                filters.push(new Filter("Zcheck", OP.EQ, "X"), new Filter("_Header/SurecTipi", OP.EQ, "M"), ...statusFilter("KalemDurum"));
            } else {
                filters.push(this._or([
                    this._and([new Filter("Zcheck", OP.EQ, "X"), ...statusFilter("KalemDurum")]),
                    this._and([new Filter("Zcheck", OP.NE, "X"), ...statusFilter("_Header/Durum")])
                ]));
            }
            return filters;
        },
        onSearch: function () {
            if (!/^[A-Za-z0-9]{1,4}$/.test(this._text("company"))) { MessageBox.warning("Tek bir şirket kodu girin (en fazla 4 karakter)."); return; }
            for (const id of ["flow", "form"]) {
                const value = this._text(id);
                if (value && (!/^\d+$/.test(value) || BigInt(value) > 9223372036854775807n)) {
                    MessageBox.warning("Akış/form numarası geçerli bir Int64 değeri olmalıdır."); return;
                }
            }
            const range = this.byId("dates");
            if (range.getValue() && (!range.getDateValue() || !range.isValidValue())) { MessageBox.warning("Geçerli bir belge tarihi aralığı girin."); return; }
            if (this._text("person") && !/^\d{11}$/.test(this._text("person"))) {
                MessageBox.warning("TCKN 11 rakamdan oluşmalıdır."); return;
            }
            ["A", "M", "E", "R"].forEach(k => this.byId("table" + k).unbindItems());
            this._searched = true;
            this._bindActive();
        },
        onReset: function () {
            this._searched = false;
            ["company", "flow", "form", "person", "dates"].forEach(id => this.byId(id).setValue(""));
            this.byId("area").setSelectedKey("");
            this.byId("statuses").setSelectedKeys(this.byId("tabs").getSelectedKey() === "R" ? [] : ["B", "H"]);
            this.byId("deleted").setSelected(false);
            ["A", "M", "E", "R"].forEach(k => this.byId("table" + k).unbindItems());
        },
        onTabSelect: function () {
            this.byId("statuses").setSelectedKeys(this.byId("tabs").getSelectedKey() === "R" ? [] : ["B", "H"]);
            if (this._searched) { this.onSearch(); }
        },
        _bindActive: function () {
            const key = this.byId("tabs").getSelectedKey() || "A", table = this.byId("table" + key);
            const info = this.getView().getModel("ui");
            table.bindItems({
                path: key === "A" || key === "M" ? "/Form" : "/Kalem",
                filters: this._filters(key), sorter: key === "E" ? [new Sorter("FaturaId"), new Sorter("AkisNumarasi", true), new Sorter("OrderId")] : new Sorter("AkisNumarasi", true),
                parameters: key === "E" || key === "R"
                    ? { $select: "*", $expand: { _Header: { $select: "*" } } }
                    : { $select: "*" },
                template: this.byId("row" + key).clone(), templateShareable: false,
                events: {
                    dataRequested: function () { table.setBusy(true); },
                    dataReceived: function (event) {
                        table.setBusy(false);
                        const error = event.getParameter("error");
                        info.setProperty("/connection", error ? "Servis okuma hatası: " + error.message : "Salt okunur servis sorgusu tamamlandı.");
                        if (error) { MessageBox.error(error.message); }
                    }
                }
            });
        },
        onRefresh: function () { if (this._searched) { this.onSearch(); } },
        _detailMessages: function (data, header) {
            return Array.from(new Set([...(header.SAP__Messages || []), ...(data.SAP__Messages || [])]
                .map(message => message.message).filter(Boolean))).join("\n");
        },
        _detailFilters: function (data, header) {
            const filters = [
                new Filter("AkisNumarasi", OP.EQ, data.AkisNumarasi),
                new Filter("_Header/SirketKodu", OP.EQ, header.SirketKodu)
            ];
            if (data.OrderId !== undefined && data.Zcheck === "X") {
                filters.push(new Filter("FaturaId", OP.EQ, data.FaturaId), new Filter("Zcheck", OP.EQ, "X"));
            } else if (header.SurecTipi === "M") {
                filters.push(new Filter("Zcheck", OP.NE, "X"));
            }
            return filters;
        },
        onDetail: async function (event) {
            if (this._openingDetail) { return; }
            this._openingDetail = true;
            const context = event.getParameter("listItem").getBindingContext();
            const data = context.getObject(), item = data.OrderId !== undefined;
            this._detailContext = context;
            this.getView().setBusy(true);
            try {
                if (!this._dialog) {
                    this._dialog = await Fragment.load({ id: this.getView().getId(), name: "com.golive.demiroren.zficspkokpit.view.fragments.CockpitDetail", controller: this });
                    this.getView().addDependent(this._dialog);
                }
                const model = this.getView().getModel("detail");
                const header = item ? await context.requestObject("_Header") : await context.requestObject();
                model.setProperty("/header", header);
                model.setProperty("/title", (item && data.Zcheck === "X" ? "Fatura: " + data.FaturaId : "Form") + " · Akış: " + data.AkisNumarasi);
                model.setProperty("/messages", this._detailMessages(data, header));
                const filters = this._detailFilters(data, header);
                this.byId("detailItems").bindItems({ path: "/Kalem", filters: filters, sorter: new Sorter("OrderId"), parameters: { $expand: "_Header" }, template: this.byId("detailRow").clone(), templateShareable: false });
                this.byId("detailHistory").bindItems({ path: "/IslemGecmisi", filters: [new Filter("AkisNumarasi", OP.EQ, data.AkisNumarasi)], sorter: new Sorter("Sira", true), template: this.byId("historyRow").clone(), templateShareable: false });
                ["detailItems", "detailHistory"].forEach(id => {
                    this.byId(id).getBinding("items").attachDataReceived(e => { const error = e.getParameter("error"); if (error) { MessageBox.error(error.message); } });
                });
                this._dialog.open();
            } catch (error) { MessageBox.error(error.message); }
            finally { this._openingDetail = false; this.getView().setBusy(false); }
        },
        onDetailRefresh: async function () {
            if (this._refreshingDetail) { return; }
            this._refreshingDetail = true;
            this._dialog.setBusy(true);
            try {
                await this._detailContext.requestRefresh();
                const ctx = this._detailContext;
                const data = await ctx.requestObject();
                const header = data.OrderId !== undefined ? await ctx.requestObject("_Header") : data;
                const model = this.getView().getModel("detail");
                model.setProperty("/header", header);
                model.setProperty("/messages", this._detailMessages(data, header));
                ["detailItems", "detailHistory"].forEach(id => this.byId(id).getBinding("items").refresh());
            } catch (error) { MessageBox.error(error.message); }
            finally { this._refreshingDetail = false; this._dialog.setBusy(false); }
        },
        onCloseDetail: function () { this._dialog.close(); },
        _exportRow: function (row) {
            const header = row.OrderId === undefined ? row : row._Header || {};
            const efatura = header.SurecTipi === "M" && row.Zcheck === "X";
            return Object.assign({}, row, {
                SirketKodu: header.SirketKodu, FormNumarasi: header.FormNumarasi,
                MasrafTuru: header.AvansTuru, MasrafTuruAciklama: formatter.kind(header.AvansTuru),
                SurecTipi: header.SurecTipi, Surec: efatura ? "E" : header.SurecTipi,
                YurticiYurtdisi: header.YurticiYurtdisi, AvansFormNumarasi: header.AvansFormNumarasi,
                Tckn: header.Tckn, SicilNo: header.SicilNo,
                BelgeTarihi: header.BelgeTarihi, KayitTarihi: header.KayitTarihi,
                Durum: efatura ? row.KalemDurum : header.Durum,
                HataMesaji: efatura ? row.HataMesaji : header.HataMesaji,
                TalepBelge: header.TalepBelge, TalepYil: header.TalepYil, OdemeBelge: header.OdemeBelge,
                MuhasebeBelge: header.MuhasebeBelge, MuhasebeYil: header.MuhasebeYil,
                TersBelge: efatura ? row.TersBelge : header.TersBelge,
                TersYil: efatura ? row.TersYil : header.TersYil
            });
        },
        onExport: function () {
            const table = this.byId("table" + (this.byId("tabs").getSelectedKey() || "A"));
            const rows = table.getItems().map(i => i.getBindingContext().getObject());
            if (!rows.length) { MessageBox.information("Önce kayıtları listeleyin."); return; }
            MessageBox.confirm("Yalnızca yüklenen " + rows.length + " satır aktarılacak. Diğer sayfalar dahil değildir. Kimlik ve ondalık hassasiyeti için değerler metin olarak aktarılır.", { onClose: action => {
                if (action !== MessageBox.Action.OK) { return; }
                sap.ui.require(["sap/ui/export/Spreadsheet"], Spreadsheet => {
                    const fields = ["SirketKodu", "AkisNumarasi", "FormNumarasi", "MasrafTuru", "MasrafTuruAciklama", "SurecTipi", "Surec", "YurticiYurtdisi", "AvansFormNumarasi", "Durum", "BelgeTarihi", "KayitTarihi", "Tckn", "SicilNo", "TalepBelge", "TalepYil", "OdemeBelge", "MuhasebeBelge", "MuhasebeYil", "TersBelge", "TersYil", "HataMesaji"];
                    if (rows[0].OrderId !== undefined) { fields.push("OrderId", "FaturaId", "Tutar", "ParaBirimi", "MasrafTipi", "MasrafTipiTanim", "MasrafYeri", "PYPKodu", "KdvOrani", "AracGiderTuru", "EfaturaCari", "Zcheck", "Aciklama", "VirmanBelge", "VirmanYil", "GiderBelge", "GiderYil"); }
                    const sheet = new Spreadsheet({ workbook: { columns: fields.map(f => ({ label: f, property: f, type: "String" })) }, dataSource: rows.map(row => this._exportRow(row)), fileName: "Kokpit_Yuklenen_Satirlar.xlsx", worker: false });
                    sheet.build().catch(e => MessageBox.error(e.message)).finally(() => sheet.destroy());
                });
            } });
        },
        onExit: function () { if (this._dialog) { this._dialog.destroy(); } }
    });
});
