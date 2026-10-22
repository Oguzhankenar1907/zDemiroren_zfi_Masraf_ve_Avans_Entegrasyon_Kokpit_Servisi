sap.ui.define([], function () {
    "use strict";

    return {
        formatFormStatusText: function (sStatus) {
            const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            switch (sStatus) {
                case "T":
                    return oBundle.getText("status_T");
                case "O":
                    return oBundle.getText("status_O");
                case "M":
                    return oBundle.getText("status_M");
                case "H":
                    return oBundle.getText("status_H");
                case "S":
                    return oBundle.getText("status_S");
                case "R":
                    return oBundle.getText("status_R");
                default:
                    return sStatus || "";
            }
        },

        formatFormStatusState: function (sStatus) {
            switch (sStatus) {
                case "M":
                case "O":
                    return "Success";
                case "T":
                    return "Information";
                case "H":
                    return "Error";
                case "S":
                    return "None";
                case "R":
                    return "Warning";
                default:
                    return "None";
            }
        },

        formatFormStatusIcon: function (sStatus) {
            switch (sStatus) {
                case "M":
                    return "sap-icon://accept";
                case "O":
                    return "sap-icon://paid";
                case "T":
                    return "sap-icon://pending";
                case "H":
                    return "sap-icon://error";
                case "S":
                    return "sap-icon://delete";
                case "R":
                    return "sap-icon://undo";
                default:
                    return "";
            }
        },

        formatKalemStatusText: function (sStatus) {
            const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            switch (sStatus) {
                case "1":
                    return oBundle.getText("kstatus_1");
                case "2":
                    return oBundle.getText("kstatus_2");
                case "3":
                    return oBundle.getText("kstatus_3");
                case "4":
                    return oBundle.getText("kstatus_4");
                case "5":
                    return oBundle.getText("kstatus_5");
                case "6":
                    return oBundle.getText("kstatus_6");
                default:
                    return sStatus || "";
            }
        },

        formatKalemStatusState: function (sStatus) {
            switch (sStatus) {
                case "3":
                    return "Success";
                case "2":
                    return "Information";
                case "1":
                    return "Warning";
                case "4":
                    return "Error";
                case "5":
                    return "None";
                case "6":
                    return "Indication05";
                default:
                    return "None";
            }
        },

        formatKalemStatusIcon: function (sStatus) {
            switch (sStatus) {
                case "3":
                    return "sap-icon://accept";
                case "2":
                    return "sap-icon://journey-change";
                case "1":
                    return "sap-icon://pending";
                case "4":
                    return "sap-icon://error";
                case "5":
                    return "sap-icon://delete";
                case "6":
                    return "sap-icon://undo";
                default:
                    return "";
            }
        },

        formatDate: function (dDate) {
            if (!dDate) {
                return "";
            }
            if (typeof dDate === "string") {
                // If format is YYYY-MM-DD
                const aParts = dDate.split("-");
                if (aParts.length === 3) {
                    return aParts[2] + "." + aParts[1] + "." + aParts[0];
                }
                return dDate;
            }
            if (dDate instanceof Date) {
                const day = String(dDate.getDate()).padStart(2, "0");
                const month = String(dDate.getMonth() + 1).padStart(2, "0");
                const year = dDate.getFullYear();
                return `${day}.${month}.${year}`;
            }
            return "";
        },

        formatTime: function (oTime) {
            if (!oTime) {
                return "";
            }
            if (typeof oTime === "string") {
                return oTime.substring(0, 8);
            }
            return "";
        },

        formatCurrencyAmount: function (sAmount, sCurrency) {
            if (sAmount === null || sAmount === undefined || sAmount === "") {
                return "";
            }
            const nNum = parseFloat(sAmount);
            if (isNaN(nNum)) {
                return sAmount;
            }
            return nNum.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (sCurrency ? " " + sCurrency : "");
        }
    };
});
