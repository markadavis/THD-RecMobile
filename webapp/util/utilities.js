sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox"
], function(JSONModel, MessageBox) {
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
		 * @param {string} sPayload OData error response payload.
		 * @returns {array} array of error messages.
		 * @public
		 */
		parseErrorPayload: function(sPayload) {
			var aErrMsgs = [],
				aErrors = [];
			if (sPayload.response && sPayload.response.hasOwnProperty("responseText")) {
				try {
					var oParsed = JSON.parse(sPayload.response.responseText);
					if (oParsed.hasOwnProperty("error") 
							&& oParsed.error.hasOwnProperty("innererror")
							&& oParsed.error.innererror.hasOwnProperty("errordetails")) {
						aErrors = oParsed.error.innererror.errordetails;
					}
				} catch(err) {
					// Leave the errors array empty.
				}
			}

			for (var e = 0; e < aErrors.length; e++) {
				var mErrMsg = {
						PONbr: "",
						POItem: "",
						msgid: "",
						msgno: "",
						msgtx: ""
					},
					aKeys = aErrors[e].code.split(":")[0].split("|"),
					aMessage = aErrors[e].message.split("~"),
					aMsgTy = [];
				if (Array.isArray(aKeys) && aKeys.length > 1) {
					mErrMsg.PONbr = this.formatter.removeLeadingZeros(aKeys[0]);
					mErrMsg.POItem = aKeys[1];
				}
				if (Array.isArray(aMessage) && aMessage.length > 1) {
					aMsgTy = aMessage[0].split("/");
					if (Array.isArray(aMsgTy)) {
						mErrMsg.msgid = aMsgTy[0];
						mErrMsg.msgno = aMsgTy[1];
						mErrMsg.msgtx = aMessage[1];
					} else {
						mErrMsg.lmsgtx = aMessage;
					}
				} else {
					mErrMsg.msgtx = aMessage[0];
					aMsgTy = aErrors[e].code.split("/");
					if (Array.isArray(aMsgTy)) {
						if (aMsgTy.length > 2) {
							mErrMsg.msgid = "/" + aMsgTy[1];
							mErrMsg.msgno = aMsgTy[2];
						} else {
							mErrMsg.msgid = aMsgTy[0];
							mErrMsg.msgno = aMsgTy[1];
						}
					}
				}
				aErrMsgs.splice(0, 0, mErrMsg);
			}

			return aErrMsgs;
		},

		/**
		 * Show a warning message to the user.
		 * @param {string} sIcon - optional icon to be used.
		 * @param {string} sI18nKey key value to the I18N text resource.
		 * @param {array} aVars Optional variables to add to the I81N text.
		 * @param {function} fnCallBack function to call on user action.
		 * @pubilc
		 */
		showMessageBox : function (sIcon, sI18nKey, aVars, fnCallBack) {
			var sMessage = this._oComponent.getText(sI18nKey, aVars),
				sTitle = this._oComponent.getText("MessageDialogInformation");
			switch (sIcon) {
				case MessageBox.Icon.QUESTION:
					sTitle = this._oComponent.getText("MessageDialogQuestion");
					break;
				case MessageBox.Icon.SUCCESS:
					sTitle = this._oComponent.getText("MessageDialogSuccess");
					break;
				case MessageBox.Icon.WARNING:
					sTitle = this._oComponent.getText("MessageDialogWarning");
					break;
				case MessageBox.Icon.ERROR:
					sTitle = this._oComponent.getText("MessageDialogError");
					break;
			}
			MessageBox.show(sMessage, {
				icon: sIcon,
				title: sTitle,
				styleClass : this._oComponent.getContentDensityClass(),
				actions : [MessageBox.Action.CLOSE],
				onClose : function (sAction) {
					if (fnCallBack) {
						fnCallBack(sAction);
					}
				}
			});
		}
	};

});