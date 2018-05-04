sap.ui.define([
	"sap/ui/core/format/DateFormat"
], function (DateFormat) {
	"use strict";
	return {
		/**
		 * Bind the app Component
		 * @param {sap/ui/core/UIComponent} oComponent is the app's Component.
		 * @public
		 */
		bindComponent : function (oController) {
			this._oController = oController;
			this._oComponent = this._oController.getOwnerComponent();
		},

		/**
		 * Output format the javascript Date() value with both date and time (as text).
		 * @param {date} dValue internal date value.
		 * @param {boolean} bNoTime send true to include the time, otherwise send false.
		 * @returns {string} sDate formatted date.
		 * @public
		 */
		formatDateTime: function(dValue, bNoTime) {
			var sDate = "";
			if (dValue !== "") {
				var sLanguage = this._oComponent.getText("appLanguageId"),
					sAtSign = this._oComponent.getText("appAtSign"),
					sPattern = "MM/dd/yyyy " + sAtSign + " hh:mm a";
				if (bNoTime) {
					sPattern = "MM/dd/yyyy";
				}
				switch (sLanguage) {
					case "FR":
						if (bNoTime) {
							sPattern = "yyyy/MM/dd";
						} else {
							sPattern = "yyyy/MM/dd " + sAtSign + " HH:mm";
						}
						break;
				}
				if (dValue) {
					sDate = DateFormat.getDateInstance({
						pattern: sPattern
					}).format(dValue);
				}
			}
			return sDate;
		},

		/**
		 * Return the date format for the sap.m.DatePicker component.
		 * @returns {string} sPattern formatted date
		 * @public
		 */
		datePattern : function () {
			var sLanguage = this._oComponent.getText("appLanguageId"),
				sPattern = "MM/dd/yyyy";

			switch (sLanguage) {
				case "EN":
					sPattern = "MM/dd/yyyy";
					break;
				case "FR":
					sPattern = "yyyy/MM/dd";
					break;
			}

			return sPattern;
		},

		/**
		 * Return the time format for the sap.m.TimePicker component.
		 * @returns {string} sPattern formatted date
		 * @public
		 */
		timePattern : function () {
			var sLanguage = this._oComponent.getText("appLanguageId"),
				sPattern = "hh:mm a";

			switch (sLanguage) {
				case "EN":
					sPattern = "hh:mm a";
					break;
				case "FR":
					sPattern = "HH:mm";
					break;
			}

			return sPattern;
		},

		/**
		 * Remove leading zeros from a number.
		 * @param {string} sNumberIn number with leading zeros
		 * @returns {string} sNumberOut without leadeing zeros
		 * @public
		 */
		removeLeadingZeros : function (sNumberIn) {
        	var sNumberOut = sNumberIn ? sNumberIn.replace(/^0+/, "") : "";
        	return sNumberOut;
		},

		/**
		 * Convert a number (string or number) to a zero filled string (padded to the left).
		 * 		(note: the max size this function can accomodate is 20 digits/characgters)
		 * @param {string} value to be converted (can be a number or a string).
		 * @param {integer} iValueLength an interger value for the final size of the converted value.
		 * @returns {string} the zero filled number as a string.
		 * @public
		 */
		addLeadingZeros : function (value, iValueLength) {
			// Convert the value to a string.
			var sValue = "" + value;
			// return the zero padded string;
			return "00000000000000000000".substring(0, iValueLength - sValue.length) + sValue;
		},

		/**
		 * Convert the Shipment Status code from the OData service to a text value.
		 * @param {string} sStatCode Shipment Status from OData service (01/02/03/04).
		 * @returns {string} Text value of the Shipment Status Code.
		 * @public
		 */
		statusText : function (sStatCode, oHeaderObject) {
			var sStatText = "";
			if (sStatCode && "NRX".search(sStatCode) > 0) {
				// Called from the Pallet/PO header.
				switch (sStatCode) {
					case "N":
						sStatText = this._oComponent.getText("PalletDialog_StatusNotAccepted");
						break;
					case "R":
						sStatText = this._oComponent.getText("PalletDialog_StatusDGR");
						break;
					case "X":
						sStatText = this._oComponent.getText("PalletDialog_StatusComplete");
						break;
				}
			} else if (sStatCode) {
				// Called from the Waybill header.
				switch (sStatCode) {
					case "01":
						sStatText = this._oComponent.getText("WaybillHeader_PanelTitleRGR");
						break;
					case "02":
						sStatText = this._oComponent.getText("WaybillHeader_PanelTitleReturns");
						break;
					case "03":
						sStatText = this._oComponent.getText("WaybillHeader_PanelTitleDGR");
						break;
					case "04":
						sStatText = this._oComponent.getText("WaybillHeader_PanelTitleDone");
						break;
				}
				if (oHeaderObject && oHeaderObject.hasOwnProperty("Seal") && oHeaderObject.Seal === "X") {
					sStatText = this._oComponent.getText("WaybillHeader_PanelTitlePallets") + " " + sStatText;
				} else if (oHeaderObject && oHeaderObject.hasOwnProperty("Seal")) {
					sStatText = this._oComponent.getText("WaybillHeader_PanelTitlePOs") + " " + sStatText;
				}
			}
			return sStatText;
		},

		/**
		 * Set the "Exception" button's type property based on the existence of entered exceptions
		 * @param {string} sStoreId Store (site) ID
		 * @param {string} sWayBillNbr Waybill Number
		 * @param {string} sPalletId Pallet ID
		 * @param {string} sPONbr PO Number
		 * @param {string} sItemId PO Item ID
		 * @return {string} sType button background color
		 * @public
		 */
		 exceptionBtnType : function (sStoreId, sWayBillNbr, sPalletId, sPONbr, sItemId, sArticle) {
			var sType = sap.m.ButtonType.Default;
			if (sStoreId && sWayBillNbr) {
				var sPath = this._oServiceModel.createKey("/ExceptionSet", {
						StoreID: this.formatter.addLeadingZeros(sStoreId,4),
						WayBillNbr: sWayBillNbr,
						Pallet: sPalletId ? sPalletId !== "X" ? sPalletId : "" : "",
						PONbr: sPONbr ? sPONbr !== "X" ? sPONbr : "" : "",
						ItemID: this.formatter.addLeadingZeros((sItemId ? sItemId !== "X" ? sItemId : "" : ""),5),
						Article: sArticle ? sArticle !== "X" ? sArticle : "" : ""
					});
				if (this._oServiceModel.getProperty(sPath)) {
					sType = sap.m.ButtonType.Emphasized;
				}
			}
			return sType;
		 },

		 /**
		 * Set the "Exception" button's visible property based on the existence of entered exceptions
		 * @param {string} sStoreId Store (site) ID
		 * @param {string} sWayBillNbr Waybill Number
		 * @param {string} sPalletId Pallet ID
		 * @param {string} sPONbr PO Number
		 * @param {string} sItemId PO Item ID
		 * @return {boolean} bVisible button background color
		 * @public
		 */
		 exceptionBtnVisible : function (sStoreId, sWayBillNbr, sPalletId, sPONbr, sItemId, sArticle) {
			var bVisible = false;
			if (sStoreId && sWayBillNbr) {
				var sPath = this._oServiceModel.createKey("/ExceptionSet", {
						StoreID: this.formatter.addLeadingZeros(sStoreId,4),
						WayBillNbr: sWayBillNbr,
						Pallet: sPalletId ? sPalletId !== "X" ? sPalletId : "" : "",
						PONbr: sPONbr ? sPONbr !== "X" ? sPONbr : "" : "",
						ItemID: this.formatter.addLeadingZeros((sItemId ? sItemId !== "X" ? sItemId : "" : ""),5),
						Article: sArticle ? sArticle !== "X" ? sArticle : "" : ""
					});
				if (this._oServiceModel.getObject(sPath)) {
					bVisible = true;
				}
			}
			return bVisible;
		 }
		 
	};
});