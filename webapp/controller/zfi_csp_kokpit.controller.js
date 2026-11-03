sap.ui.define([
    "sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator", "sap/ui/model/Sorter", "sap/m/MessageBox",
    "sap/ui/core/Fragment", "com/golive/demiroren/zficspkokpit/model/formatter", "sap/ui/core/Messaging"
], function (Controller, JSONModel, Filter, OP, Sorter, MessageBox, Fragment, formatter, Messaging) {
    "use strict";
    return Controller.extend("com.golive.demiroren.zficspkokpit.controller.zfi_csp_kokpit", {
        formatter: formatter,
        onInit: function () {
            this.getView().setModel(new JSONModel({
                connection: "Şirket seçip formları filtreleyin.",
                advanceSelectionEligible: false,
                advanceBackendReady: false,
                act: { A: {}, M: {}, E: {} }
            }), "ui");
            this.getView().setModel(new JSONModel({ title: "", header: {}, messages: "" }), "detail");
        },
        _text: function (id) { return this.byId(id).getValue().trim(); },
        onAvansSelectionChange: function () {
            const eligible = this.byId("tableA").getSelectedContexts().some(context => {
                const row = context.getObject();
                return row.SurecTipi === "A" && ["B", "H"].includes(row.Durum) &&
                    row.__OperationControl?.AvansTalebiOlustur === true;
            });
            this.getView().getModel("ui").setProperty("/advanceSelectionEligible", eligible);
            this._updateActions("A");
        },
        // Aksiyon namespace'i (kokpit servisi)
        _N: "com.sap.gateway.srvd.zui_fi_csp_kokpit_o4.v0001",
        // Buton uygunluk kuralları: sekme -> aksiyon -> uygun durumlar. Kesin kontrol backend'dedir.
        _actionRules: { SilmeKoy: ["B", "H"], SilmeKaldir: ["S"], Muhasebelestir: ["B", "H"], Virman: ["B", "H"], Giderlestir: ["V"], TersKayit: ["M"] },
        // E-Fatura sekmesinde kurala göre farklı durumlar (KalemDurum)
        _itemRules: { TersKayit: ["V", "G"] },
        _ruleFor: function (key, name) { return (key === "E" && this._itemRules[name]) || this._actionRules[name] || []; },
        // E-Fatura sekmesinde Kalem entity'sindeki aksiyon adları (Virman/Giderlestir aynı ad)
        _itemActions: { SilmeKoy: "KalemSilmeKoy", SilmeKaldir: "KalemSilmeKaldir", TersKayit: "KalemTersKayit" },
        _rowStatus: function (key, row) { return key === "E" ? row.KalemDurum : row.Durum; },
        _updateActions: function (key) {
            if (!["A", "M", "E"].includes(key)) { return; }
            const rows = this.byId("table" + key).getSelectedContexts().map(c => c.getObject()).filter(Boolean);
            const act = {};
            Object.keys(this._actionRules).forEach(name => {
                const rule = this._ruleFor(key, name);
                act[name] = rows.some(r => rule.includes(this._rowStatus(key, r)));
            });
            this.getView().getModel("ui").setProperty("/act/" + key, act);
        },
        onRowSelectionChange: function (event) {
            const source = event.getSource();
            const key = ["M", "E"].find(k => this.byId("table" + k) === source);
            this._updateActions(key);
        },
        onSilmeKoy: function () { this._runAction("SilmeKoy", "Silme işareti konuldu."); },
        onSilmeKaldir: function () { this._runAction("SilmeKaldir", "Silme işareti kaldırıldı."); },
        _confirmItemAction: function (name, question, okText) {
            const keys = new Set(this.byId("tableE").getSelectedContexts().map(c => c.getObject())
                .filter(r => r && this._actionRules[name].includes(r.KalemDurum)).map(r => r.AkisNumarasi + "|" + r.FaturaId));
            MessageBox.confirm(keys.size + " " + question, {
                onClose: action => { if (action === MessageBox.Action.OK) { this._runAction(name, okText); } }
            });
        },
        onVirman: function () { this._confirmItemAction("Virman", "fatura için virman belgesi oluşturulacak. Devam edilsin mi?", "Virman yapıldı."); },
        onGiderlestir: function () { this._confirmItemAction("Giderlestir", "fatura için giderleştirme belgesi oluşturulacak. Devam edilsin mi?", "Giderleştirildi."); },
        // Ters Kayıt: kayıt tarihi penceresi (zorunlu, varsayılan bugün, ileri tarih yok - spec 3.6)
        onTersKayit: function () {
            const key = this.byId("tabs").getSelectedKey() || "A";
            sap.ui.require(["sap/m/Dialog", "sap/m/DatePicker", "sap/m/Label", "sap/m/Button", "sap/m/Text", "sap/m/VBox"],
                (Dialog, DatePicker, Label, Button, Text, VBox) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const picker = new DatePicker({ dateValue: today, maxDate: today, displayFormat: "dd.MM.yyyy", required: true, width: "100%" });
                    const info = key === "E"
                        ? "Seçili faturalarda: Giderleştirilmiş ise giderleştirme belgesi, Virman yapılmış ise virman belgesi ters kaydedilir."
                        : "Seçili formların " + (key === "A" ? "avans talebi" : "muhasebe") + " belgesi ters kaydedilir. Bu işlem geri alınamaz.";
                    const dialog = new Dialog({
                        title: "Ters Kayıt",
                        contentWidth: "24rem",
                        content: [new VBox({ items: [new Text({ text: info }).addStyleClass("sapUiSmallMarginBottom"), new Label({ text: "Kayıt tarihi", required: true }), picker] }).addStyleClass("sapUiSmallMargin")],
                        beginButton: new Button({
                            text: "Ters Kaydet", type: "Emphasized",
                            press: () => {
                                const date = picker.getDateValue();
                                if (!date || !picker.isValidValue()) { picker.setValueState("Error").setValueStateText("Geçerli bir tarih girin."); return; }
                                if (date > today) { picker.setValueState("Error").setValueStateText("Kayıt tarihi bugünden ileri olamaz."); return; }
                                dialog.close();
                                this._runAction("TersKayit", "Ters kaydedildi.", { KayitTarihi: this._date(date) });
                            }
                        }),
                        endButton: new Button({ text: "Vazgeç", press: () => dialog.close() }),
                        afterClose: () => dialog.destroy()
                    });
                    this.getView().addDependent(dialog);
                    dialog.open();
                });
        },
        onMuhasebelestir: function () {
            const count = this.byId("tableM").getSelectedContexts().filter(c => {
                const r = c.getObject();
                return r && this._actionRules.Muhasebelestir.includes(r.Durum);
            }).length;
            MessageBox.confirm(count + " masraf formu için muhasebe belgesi oluşturulacak. Devam edilsin mi?", {
                onClose: action => { if (action === MessageBox.Action.OK) { this._runAction("Muhasebelestir", "Muhasebeleştirildi."); } }
            });
        },
        // Seçili satırlar için bound aksiyonu çağırır.
        // Avans/Masraf: Form aksiyonu, form başına bir çağrı.
        // E-Fatura: Kalem aksiyonu (Kalem + ad), fatura (AkisNumarasi + FaturaId) başına bir çağrı;
        // backend işlemi faturanın tüm kalemlerine uygular.
        _runAction: async function (name, okText, params) {
            if (this._actionRunning) { return; }
            const key = this.byId("tabs").getSelectedKey() || "A";
            const table = this.byId("table" + key);
            const isItem = key === "E";
            const action = isItem ? (this._itemActions[name] || name) : name;
            const allowed = this._ruleFor(key, name);
            const seen = new Set(), targets = [];
            table.getSelectedContexts().forEach(ctx => {
                const row = ctx.getObject();
                if (!row || !allowed.includes(this._rowStatus(key, row))) { return; }
                const id = isItem ? row.AkisNumarasi + "|" + row.FaturaId : String(row.AkisNumarasi);
                if (seen.has(id)) { return; }
                seen.add(id);
                targets.push({ ctx: ctx, label: isItem ? "Fatura " + row.FaturaId + " (akış " + row.AkisNumarasi + ")" : "Form " + row.FormNumarasi });
            });
            if (!targets.length) { MessageBox.information("Seçili satırlar arasında bu işlem için uygun durumda kayıt yok."); return; }
            this._actionRunning = true;
            this.getView().setBusy(true);
            const lines = [];
            let hasError = false;
            try {
                for (const t of targets) {
                    const operation = this.getView().getModel().bindContext(this._N + "." + action + "(...)", t.ctx);
                    Object.keys(params || {}).forEach(p => operation.setParameter(p, params[p]));
                    // Backend iş hatalarını HTTP 200 + hata mesajı olarak da dönebilir; sonuç mesajlardan okunur
                    Messaging.removeAllMessages();
                    try {
                        await operation.invoke();
                        const messages = Messaging.getMessageModel().getData();
                        const errors = messages.filter(m => m.getType() === "Error").map(m => m.getMessage());
                        const others = messages.filter(m => m.getType() !== "Error" && this._isOwnMessage(m)).map(m => m.getMessage());
                        if (errors.length) {
                            hasError = true;
                            lines.push("✗ " + t.label + ": " + Array.from(new Set(errors)).join(" | "));
                        } else {
                            lines.push("✓ " + t.label + ": " + (others.length ? Array.from(new Set(others)).join(" | ") : okText));
                        }
                    } catch (error) {
                        hasError = true;
                        const errors = Messaging.getMessageModel().getData().filter(m => m.getType() === "Error").map(m => m.getMessage());
                        const text = errors.length ? Array.from(new Set(errors)).join(" | ") : (error && error.message ? error.message : String(error));
                        lines.push("✗ " + t.label + ": " + text);
                    } finally {
                        operation.destroy();
                        Messaging.removeAllMessages();
                    }
                }
            } finally {
                this._actionRunning = false;
                this.getView().setBusy(false);
            }
            table.removeSelections(true);
            this._updateActions(key);
            const binding = table.getBinding("items");
            if (binding) { binding.refresh(); }
            MessageBox[hasError ? "warning" : "success"](lines.join("\n"));
        },
        // Faz 5: Fiori Launchpad adresi (yalnız uygulama launchpad dışında, ör. VS Code önizlemesinde çalışırken kullanılır).
        // Örnek: "https://my123456.s4hana.cloud.sap/ui". Launchpad içinde çalışırken boş kalabilir.
        _FLP_URL: "",
        // Belge numarasına tıklanınca belge Manage Journal Entries'te yeni sekmede açılır.
        onDocPress: function (event, belnrField, gjahrField, fromDetail) {
            const obj = fromDetail ? this.getView().getModel("detail").getProperty("/header")
                : event.getSource().getBindingContext().getObject();
            const belnr = obj && obj[belnrField];
            if (!belnr) { return; }
            const header = obj.SirketKodu ? obj : (obj._Header || {});
            const gjahr = obj[gjahrField];
            const doc = String(belnr).replace(/^0+/, "");
            const hash = "AccountingDocument-manageV2&/C_ManageJournalEntryTP(CompanyCode='" + header.SirketKodu +
                "',FiscalYear='" + gjahr + "',AccountingDocument='" + doc + "')";
            const inFlp = !!(window.sap && window.sap.ushell && window.sap.ushell.Container);
            const base = inFlp ? window.location.href.split("#")[0] : this._FLP_URL;
            if (!base) {
                MessageBox.information("Belge: " + doc + " / " + gjahr + " (şirket " + header.SirketKodu + ")\n\n" +
                    "Uygulama launchpad dışında çalıştığı için belge açılamıyor. Manage Journal Entries'te bu numarayla arayabilirsiniz.");
                return;
            }
            window.open(base + "#" + hash, "_blank");
        },
        // Başarı/uyarı mesajlarından yalnız kokpitin kendi mesajları (ZFI_MSR) gösterilir.
        // Muhasebe belgesi servisinin kendi bilgi mesajı ("Document posted successfully: BKPFF ...") gizlenir.
        // Hata mesajları filtrelenmez.
        _isOwnMessage: function (m) {
            const code = (m.getCode && m.getCode()) || "";
            if (code) { return code.indexOf("ZFI_MSR") === 0; }
            return !/BKPFF|Document posted successfully/i.test(m.getMessage() || "");
        },
        _clearAdvanceSelection: function () {
            ["A", "M", "E"].forEach(k => this.byId("table" + k).removeSelections(true));
            this.getView().getModel("ui").setProperty("/advanceSelectionEligible", false);
            this.getView().getModel("ui").setProperty("/act", { A: {}, M: {}, E: {} });
        },
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
                // "Silme işaretlileri getir" işaretliyse durum seçimine S de eklenir (spec 1.1)
                const keys = deleted && statuses.length && !statuses.includes("S") ? statuses.concat("S") : statuses;
                if (keys.length) { parts.push(this._or(keys.map(s => new Filter(path, OP.EQ, s)))); }
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
            this._clearAdvanceSelection();
            ["A", "M", "E", "R"].forEach(k => this.byId("table" + k).unbindItems());
            this._searched = true;
            this._bindActive();
        },
        onReset: function () {
            this._clearAdvanceSelection();
            this._searched = false;
            ["company", "flow", "form", "person", "dates"].forEach(id => this.byId(id).setValue(""));
            this.byId("area").setSelectedKey("");
            this.byId("statuses").setSelectedKeys(this.byId("tabs").getSelectedKey() === "R" ? [] : ["B", "H"]);
            this.byId("deleted").setSelected(false);
            ["A", "M", "E", "R"].forEach(k => this.byId("table" + k).unbindItems());
        },
        onTabSelect: function () {
            this._clearAdvanceSelection();
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
                MasrafTuru: header.MasrafTuru, MasrafTuruAciklama: formatter.kind(header.MasrafTuru),
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
