sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "com/golive/demiroren/zficspkokpit/model/formatter"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageBox,
    MessageToast,
    Fragment,
    formatter
) {
    "use strict";

    return Controller.extend("com.golive.demiroren.zficspkokpit.controller.zfi_csp_kokpit", {
        formatter: formatter,

        onInit: function () {
            // View Model for button enablement and transient UI states
            const oViewModel = new JSONModel({
                avansButtons: {
                    olustur: false,
                    tersKayit: false,
                    silmeKoy: false,
                    silmeKaldir: false,
                    detay: false,
                    gecmis: false
                },
                masrafButtons: {
                    muhasebelestir: false,
                    tersKayit: false,
                    silmeKoy: false,
                    silmeKaldir: false,
                    detay: false,
                    gecmis: false
                },
                efaturaButtons: {
                    virman: false,
                    giderlestir: false,
                    tersKayit: false,
                    silmeKoy: false,
                    silmeKaldir: false,
                    gecmis: false
                }
            });
            this.getView().setModel(oViewModel, "viewModel");

            // Models for Dialogs
            this.getView().setModel(new JSONModel({ title: "", items: [] }), "dialogModel");
            this.getView().setModel(new JSONModel({ title: "", items: [] }), "historyModel");

            // State for Reversal Dialog Action
            this._oPendingReversal = null;
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        // =====================================================================
        // FILTERING & SEARCH
        // =====================================================================

        onSearch: function () {
            const sSirketKodu = this.byId("fbSirketKodu").getValue();
            if (!sSirketKodu) {
                MessageBox.warning(this.getResourceBundle().getText("msgSirketKoduZorunlu"));
                return;
            }

            this._applyFiltersToActiveTab();
        },

        onResetFilters: function () {
            this.byId("fbSirketKodu").setValue("");
            this.byId("fbAkisNumarasi").setValue("");
            this.byId("fbFormNumarasi").setValue("");
            this.byId("fbBelgeTarihi").setValue("");
            this.byId("fbTckn").setValue("");
            this.byId("fbDurum").setSelectedKeys([]);
            this.byId("fbSilinenler").setSelected(false);

            this._applyFiltersToActiveTab();
        },

        onTabSelect: function (oEvent) {
            this._resetButtonStates();
            this._applyFiltersToActiveTab();
        },

        _buildCommonFilters: function () {
            const aFilters = [];
            const sSirketKodu = this.byId("fbSirketKodu").getValue();
            const sAkisNumarasi = this.byId("fbAkisNumarasi").getValue();
            const sFormNumarasi = this.byId("fbFormNumarasi").getValue();
            const sTckn = this.byId("fbTckn").getValue();
            const aDurumKeys = this.byId("fbDurum").getSelectedKeys();
            const bShowDeleted = this.byId("fbSilinenler").getSelected();

            if (sSirketKodu) {
                aFilters.push(new Filter("SirketKodu", FilterOperator.EQ, sSirketKodu));
            }

            if (sAkisNumarasi) {
                aFilters.push(new Filter("AkisNumarasi", FilterOperator.EQ, parseInt(sAkisNumarasi, 10)));
            }

            if (sFormNumarasi) {
                aFilters.push(new Filter("FormNumarasi", FilterOperator.EQ, parseInt(sFormNumarasi, 10)));
            }

            if (sTckn) {
                aFilters.push(new Filter("Tckn", FilterOperator.EQ, sTckn));
            }

            // Date Range
            const oDateRange = this.byId("fbBelgeTarihi");
            const dDateFrom = oDateRange.getDateValue();
            const dDateTo = oDateRange.getSecondDateValue() || dDateFrom;
            if (dDateFrom) {
                const sFrom = this._formatDateToIso(dDateFrom);
                const sTo = this._formatDateToIso(dDateTo);
                aFilters.push(new Filter("BelgeTarihi", FilterOperator.BT, sFrom, sTo));
            }

            // Durum
            if (aDurumKeys && aDurumKeys.length > 0) {
                const aDurumFilters = aDurumKeys.map((sKey) => new Filter("Durum", FilterOperator.EQ, sKey));
                aFilters.push(new Filter({ filters: aDurumFilters, and: false }));
            } else if (!bShowDeleted) {
                // If "Show Deleted" is unchecked, exclude 'S' status
                aFilters.push(new Filter("Durum", FilterOperator.NE, "S"));
            }

            return aFilters;
        },

        _formatDateToIso: function (dDate) {
            const y = dDate.getFullYear();
            const m = String(dDate.getMonth() + 1).padStart(2, "0");
            const d = String(dDate.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        },

        _applyFiltersToActiveTab: function () {
            const oIconTabBar = this.byId("iconTabBar");
            const sSelectedKey = oIconTabBar.getSelectedKey() || "A";
            const aCommonFilters = this._buildCommonFilters();

            if (sSelectedKey === "A") {
                // Avans Tab
                const aAvansFilters = [new Filter("SurecTipi", FilterOperator.EQ, "A")].concat(aCommonFilters);
                const oBinding = this.byId("tableAvans").getBinding("items");
                if (oBinding) {
                    oBinding.filter(aAvansFilters);
                }
            } else if (sSelectedKey === "M") {
                // Masraf Tab
                const aMasrafFilters = [new Filter("SurecTipi", FilterOperator.EQ, "M")].concat(aCommonFilters);
                const oBinding = this.byId("tableMasraf").getBinding("items");
                if (oBinding) {
                    oBinding.filter(aMasrafFilters);
                }
            } else if (sSelectedKey === "E") {
                // E-Fatura Tab: applies to Kalem entity where Zcheck eq 'X'
                const aEfaturaFilters = [new Filter("Zcheck", FilterOperator.EQ, "X")];
                const sAkisNumarasi = this.byId("fbAkisNumarasi").getValue();
                const bShowDeleted = this.byId("fbSilinenler").getSelected();

                if (sAkisNumarasi) {
                    aEfaturaFilters.push(new Filter("AkisNumarasi", FilterOperator.EQ, parseInt(sAkisNumarasi, 10)));
                }
                if (!bShowDeleted) {
                    aEfaturaFilters.push(new Filter("KalemDurum", FilterOperator.NE, "5")); // '5' = Silindi
                }

                const oBinding = this.byId("tableEfatura").getBinding("items");
                if (oBinding) {
                    oBinding.filter(aEfaturaFilters);
                }
            } else if (sSelectedKey === "R") {
                // Raporlama Tab: all items
                const aRaporFilters = [];
                const sAkisNumarasi = this.byId("fbAkisNumarasi").getValue();
                if (sAkisNumarasi) {
                    aRaporFilters.push(new Filter("AkisNumarasi", FilterOperator.EQ, parseInt(sAkisNumarasi, 10)));
                }
                const oBinding = this.byId("tableRapor").getBinding("items");
                if (oBinding) {
                    oBinding.filter(aRaporFilters);
                }
            }
        },

        _resetButtonStates: function () {
            const oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/avansButtons", {
                olustur: false,
                tersKayit: false,
                silmeKoy: false,
                silmeKaldir: false,
                detay: false,
                gecmis: false
            });
            oViewModel.setProperty("/masrafButtons", {
                muhasebelestir: false,
                tersKayit: false,
                silmeKoy: false,
                silmeKaldir: false,
                detay: false,
                gecmis: false
            });
            oViewModel.setProperty("/efaturaButtons", {
                virman: false,
                giderlestir: false,
                tersKayit: false,
                silmeKoy: false,
                silmeKaldir: false,
                gecmis: false
            });
        },

        // =====================================================================
        // SELECTION CHANGE HANDLERS
        // =====================================================================

        onAvansSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const oSelectedItem = oTable.getSelectedItem();
            const oViewModel = this.getView().getModel("viewModel");

            if (!oSelectedItem) {
                oViewModel.setProperty("/avansButtons", {
                    olustur: false,
                    tersKayit: false,
                    silmeKoy: false,
                    silmeKaldir: false,
                    detay: false,
                    gecmis: false
                });
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            const oData = oContext.getObject();
            const sDurum = oData.Durum;
            const oControl = oData.__OperationControl || {};

            oViewModel.setProperty("/avansButtons", {
                olustur: oControl.AvansTalebiOlustur !== undefined ? oControl.AvansTalebiOlustur : (sDurum === "T" || sDurum === "H"),
                tersKayit: oControl.TersKayit !== undefined ? oControl.TersKayit : (sDurum === "O" || sDurum === "M"),
                silmeKoy: oControl.SilmeKoy !== undefined ? oControl.SilmeKoy : (sDurum !== "S"),
                silmeKaldir: oControl.SilmeKaldir !== undefined ? oControl.SilmeKaldir : (sDurum === "S"),
                detay: true,
                gecmis: true
            });
        },

        onMasrafSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const oSelectedItem = oTable.getSelectedItem();
            const oViewModel = this.getView().getModel("viewModel");

            if (!oSelectedItem) {
                oViewModel.setProperty("/masrafButtons", {
                    muhasebelestir: false,
                    tersKayit: false,
                    silmeKoy: false,
                    silmeKaldir: false,
                    detay: false,
                    gecmis: false
                });
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            const oData = oContext.getObject();
            const sDurum = oData.Durum;
            const oControl = oData.__OperationControl || {};

            oViewModel.setProperty("/masrafButtons", {
                muhasebelestir: oControl.Muhasebelestir !== undefined ? oControl.Muhasebelestir : (sDurum === "T" || sDurum === "H"),
                tersKayit: oControl.TersKayit !== undefined ? oControl.TersKayit : (sDurum === "M"),
                silmeKoy: oControl.SilmeKoy !== undefined ? oControl.SilmeKoy : (sDurum !== "S"),
                silmeKaldir: oControl.SilmeKaldir !== undefined ? oControl.SilmeKaldir : (sDurum === "S"),
                detay: true,
                gecmis: true
            });
        },

        onEfaturaSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const oSelectedItem = oTable.getSelectedItem();
            const oViewModel = this.getView().getModel("viewModel");

            if (!oSelectedItem) {
                oViewModel.setProperty("/efaturaButtons", {
                    virman: false,
                    giderlestir: false,
                    tersKayit: false,
                    silmeKoy: false,
                    silmeKaldir: false,
                    gecmis: false
                });
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            const oData = oContext.getObject();
            const sKalemDurum = oData.KalemDurum;
            const oControl = oData.__OperationControl || {};

            oViewModel.setProperty("/efaturaButtons", {
                virman: oControl.Virman !== undefined ? oControl.Virman : (sKalemDurum === "1" || sKalemDurum === "4"),
                giderlestir: oControl.Giderlestir !== undefined ? oControl.Giderlestir : (sKalemDurum === "2"),
                tersKayit: oControl.KalemTersKayit !== undefined ? oControl.KalemTersKayit : (sKalemDurum === "2" || sKalemDurum === "3"),
                silmeKoy: oControl.KalemSilmeKoy !== undefined ? oControl.KalemSilmeKoy : (sKalemDurum !== "5"),
                silmeKaldir: oControl.KalemSilmeKaldir !== undefined ? oControl.KalemSilmeKaldir : (sKalemDurum === "5"),
                gecmis: true
            });
        },

        // =====================================================================
        // ACTION EXECUTION (BOUND OData V4 ACTIONS)
        // =====================================================================

        _executeBoundAction: function (sActionName, oContext, mParameters) {
            const oView = this.getView();
            oView.setBusy(true);

            const sFullActionName = `com.sap.gateway.srvd.zui_fi_csp_kokpit_o4.v0001.${sActionName}(...)`;
            const oOperation = oView.getModel().bindContext(sFullActionName, oContext);

            if (mParameters) {
                Object.keys(mParameters).forEach(function (sKey) {
                    oOperation.setParameter(sKey, mParameters[sKey]);
                });
            }

            return oOperation.execute().then(() => {
                oView.setBusy(false);
                MessageToast.show(this.getResourceBundle().getText("msgIslemBasarili"));
                this._refreshAllTables();
            }).catch((oError) => {
                oView.setBusy(false);
                let sErrorMessage = oError.message || this.getResourceBundle().getText("msgIslemHata");
                MessageBox.error(sErrorMessage);
                this._refreshAllTables();
            });
        },

        _refreshAllTables: function () {
            ["tableAvans", "tableMasraf", "tableEfatura", "tableRapor"].forEach((sId) => {
                const oTable = this.byId(sId);
                if (oTable) {
                    const oBinding = oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.refresh();
                    }
                }
            });
            this._resetButtonStates();
        },

        onRefreshTable: function () {
            this._refreshAllTables();
        },

        // --- Form Actions ---

        onAvansTalebiOlustur: function () {
            const oSelected = this.byId("tableAvans").getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._executeBoundAction("AvansTalebiOlustur", oSelected.getBindingContext());
        },

        onMasrafMuhasebelestir: function () {
            const oSelected = this.byId("tableMasraf").getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._executeBoundAction("Muhasebelestir", oSelected.getBindingContext());
        },

        onFormSilmeKoy: function () {
            const oIconTabBar = this.byId("iconTabBar");
            const sKey = oIconTabBar.getSelectedKey();
            const sTableId = sKey === "M" ? "tableMasraf" : "tableAvans";
            const oSelected = this.byId(sTableId).getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._executeBoundAction("SilmeKoy", oSelected.getBindingContext());
        },

        onFormSilmeKaldir: function () {
            const oIconTabBar = this.byId("iconTabBar");
            const sKey = oIconTabBar.getSelectedKey();
            const sTableId = sKey === "M" ? "tableMasraf" : "tableAvans";
            const oSelected = this.byId(sTableId).getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._executeBoundAction("SilmeKaldir", oSelected.getBindingContext());
        },

        // --- Kalem / E-Fatura Actions ---

        onEfaturaVirman: function () {
            const oSelected = this.byId("tableEfatura").getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._executeBoundAction("Virman", oSelected.getBindingContext());
        },

        onEfaturaGiderlestir: function () {
            const oSelected = this.byId("tableEfatura").getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._executeBoundAction("Giderlestir", oSelected.getBindingContext());
        },

        onKalemSilmeKoy: function () {
            const oSelected = this.byId("tableEfatura").getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._executeBoundAction("KalemSilmeKoy", oSelected.getBindingContext());
        },

        onKalemSilmeKaldir: function () {
            const oSelected = this.byId("tableEfatura").getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._executeBoundAction("KalemSilmeKaldir", oSelected.getBindingContext());
        },

        // --- Reversal Handlers with Date Prompt Dialog ---

        onFormTersKayit: function () {
            const oIconTabBar = this.byId("iconTabBar");
            const sKey = oIconTabBar.getSelectedKey();
            const sTableId = sKey === "M" ? "tableMasraf" : "tableAvans";
            const oSelected = this.byId(sTableId).getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._openReversalDialog("TersKayit", oSelected.getBindingContext());
        },

        onKalemTersKayit: function () {
            const oSelected = this.byId("tableEfatura").getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }
            this._openReversalDialog("KalemTersKayit", oSelected.getBindingContext());
        },

        _openReversalDialog: function (sActionName, oContext) {
            this._oPendingReversal = {
                actionName: sActionName,
                context: oContext
            };

            if (!this._pReversalDialog) {
                this._pReversalDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.golive.demiroren.zficspkokpit.view.fragments.ReversalDialog",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pReversalDialog.then((oDialog) => {
                this.byId("dpReversalDate").setValue("");
                oDialog.open();
            });
        },

        onConfirmReversal: function () {
            const sDate = this.byId("dpReversalDate").getValue(); // format yyyy-MM-dd
            const oPending = this._oPendingReversal;

            this.byId("reversalDialog").close();

            if (oPending) {
                const mParams = sDate ? { KayitTarihi: sDate } : null;
                this._executeBoundAction(oPending.actionName, oPending.context, mParams);
                this._oPendingReversal = null;
            }
        },

        onCancelReversal: function () {
            this.byId("reversalDialog").close();
            this._oPendingReversal = null;
        },

        // =====================================================================
        // ITEM DETAIL & HISTORY DIALOGS
        // =====================================================================

        onOpenItemDialog: function (oEvent) {
            let oContext;
            if (oEvent.getParameter && oEvent.getParameter("listItem")) {
                oContext = oEvent.getParameter("listItem").getBindingContext();
            } else {
                const oIconTabBar = this.byId("iconTabBar");
                const sKey = oIconTabBar.getSelectedKey();
                const sTableId = sKey === "M" ? "tableMasraf" : "tableAvans";
                const oSelected = this.byId(sTableId).getSelectedItem();
                if (oSelected) {
                    oContext = oSelected.getBindingContext();
                }
            }

            if (!oContext) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }

            const nAkisNumarasi = oContext.getProperty("AkisNumarasi");
            const oDialogModel = this.getView().getModel("dialogModel");
            oDialogModel.setProperty("/title", `Form Kalemleri - Akış No: ${nAkisNumarasi}`);
            oDialogModel.setProperty("/items", []);

            // Read items for this AkisNumarasi via ListBinding
            const oModel = this.getView().getModel();
            const oListBinding = oModel.bindList("/Kalem", null, null, [
                new Filter("AkisNumarasi", FilterOperator.EQ, nAkisNumarasi)
            ]);

            this.getView().setBusy(true);
            oListBinding.requestContexts(0, 100).then((aContexts) => {
                this.getView().setBusy(false);
                const aItems = aContexts.map((c) => c.getObject());
                oDialogModel.setProperty("/items", aItems);

                if (!this._pItemDialog) {
                    this._pItemDialog = Fragment.load({
                        id: this.getView().getId(),
                        name: "com.golive.demiroren.zficspkokpit.view.fragments.ItemDialog",
                        controller: this
                    }).then((oDialog) => {
                        this.getView().addDependent(oDialog);
                        return oDialog;
                    });
                }

                this._pItemDialog.then((oDialog) => oDialog.open());
            }).catch((oErr) => {
                this.getView().setBusy(false);
                MessageBox.error(oErr.message || "Kalemler yüklenemedi.");
            });
        },

        onCloseItemDialog: function () {
            this.byId("itemDetailDialog").close();
        },

        onOpenHistoryDialog: function () {
            const oIconTabBar = this.byId("iconTabBar");
            const sKey = oIconTabBar.getSelectedKey();
            const sTableId = sKey === "M" ? "tableMasraf" : "tableAvans";
            const oSelected = this.byId(sTableId).getSelectedItem();

            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }

            const nAkisNumarasi = oSelected.getBindingContext().getProperty("AkisNumarasi");
            this._loadHistoryAndOpen(nAkisNumarasi);
        },

        onOpenHistoryDialogForKalem: function () {
            const oSelected = this.byId("tableEfatura").getSelectedItem();
            if (!oSelected) {
                MessageBox.warning(this.getResourceBundle().getText("msgSecimYapiniz"));
                return;
            }

            const nAkisNumarasi = oSelected.getBindingContext().getProperty("AkisNumarasi");
            this._loadHistoryAndOpen(nAkisNumarasi);
        },

        _loadHistoryAndOpen: function (nAkisNumarasi) {
            const oHistoryModel = this.getView().getModel("historyModel");
            oHistoryModel.setProperty("/title", `İşlem Geçmişi - Akış No: ${nAkisNumarasi}`);
            oHistoryModel.setProperty("/items", []);

            const oModel = this.getView().getModel();
            const oListBinding = oModel.bindList("/IslemGecmisi", null, null, [
                new Filter("AkisNumarasi", FilterOperator.EQ, nAkisNumarasi)
            ]);

            this.getView().setBusy(true);
            oListBinding.requestContexts(0, 100).then((aContexts) => {
                this.getView().setBusy(false);
                const aLogs = aContexts.map((c) => c.getObject());
                oHistoryModel.setProperty("/items", aLogs);

                if (!this._pHistoryDialog) {
                    this._pHistoryDialog = Fragment.load({
                        id: this.getView().getId(),
                        name: "com.golive.demiroren.zficspkokpit.view.fragments.HistoryDialog",
                        controller: this
                    }).then((oDialog) => {
                        this.getView().addDependent(oDialog);
                        return oDialog;
                    });
                }

                this._pHistoryDialog.then((oDialog) => oDialog.open());
            }).catch((oErr) => {
                this.getView().setBusy(false);
                MessageBox.error(oErr.message || "Geçmiş logları yüklenemedi.");
            });
        },

        onCloseHistoryDialog: function () {
            this.byId("historyDialog").close();
        },

        // =====================================================================
        // EXCEL EXPORT
        // =====================================================================

        onExportToExcel: function () {
            const oTable = this.byId("tableRapor");
            const oRowBinding = oTable.getBinding("items");
            if (!oRowBinding) {
                return;
            }

            sap.ui.require(["sap/ui/export/Spreadsheet", "sap/ui/export/library"], function (Spreadsheet, exportLibrary) {
                const EdmType = exportLibrary.EdmType;
                const aCols = [
                    { label: "Akış No", property: "AkisNumarasi", type: EdmType.Number, scale: 0 },
                    { label: "Sıra", property: "OrderId", type: EdmType.Number, scale: 0 },
                    { label: "Kalem Durumu", property: "KalemDurum", type: EdmType.String },
                    { label: "Tutar", property: "Tutar", type: EdmType.Number, scale: 2 },
                    { label: "Para Birimi", property: "ParaBirimi", type: EdmType.String },
                    { label: "Masraf Tipi", property: "MasrafTipi", type: EdmType.String },
                    { label: "Masraf Tanımı", property: "MasrafTipiTanim", type: EdmType.String },
                    { label: "Masraf Yeri", property: "MasrafYeri", type: EdmType.String },
                    { label: "PYP Kodu", property: "PYPKodu", type: EdmType.String },
                    { label: "KDV (%)", property: "KdvOrani", type: EdmType.Number, scale: 2 },
                    { label: "Fatura No / ETTN", property: "FaturaId", type: EdmType.String },
                    { label: "E-Fatura Cari", property: "EfaturaCari", type: EdmType.String },
                    { label: "E-Fatura mı?", property: "Zcheck", type: EdmType.String },
                    { label: "Açıklama", property: "Aciklama", type: EdmType.String },
                    { label: "Virman Belgesi", property: "VirmanBelge", type: EdmType.String },
                    { label: "Virman Yılı", property: "VirmanYil", type: EdmType.String },
                    { label: "Gider Belgesi", property: "GiderBelge", type: EdmType.String },
                    { label: "Gider Yılı", property: "GiderYil", type: EdmType.String },
                    { label: "Ters Belge", property: "TersBelge", type: EdmType.String },
                    { label: "Ters Yılı", property: "TersYil", type: EdmType.String }
                ];

                const oSettings = {
                    workbook: {
                        columns: aCols,
                        context: {
                            application: "Demiroren CSP Kokpit",
                            version: "1.0",
                            title: "Masraf ve Avans Kalem Listesi",
                            sheetName: "Kalemler"
                        }
                    },
                    dataSource: oRowBinding,
                    fileName: "Demiroren_Masraf_Avans_Raporu.xlsx",
                    worker: false
                };

                const oSheet = new Spreadsheet(oSettings);
                oSheet.build().finally(function () {
                    oSheet.destroy();
                });
            });
        }
    });
});