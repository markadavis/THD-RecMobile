sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox"
], function(UIComponent, Device, JSONModel, MessageBox) {
	"use strict";
	return UIComponent.extend("thd.recmobile.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			// Call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// Regisgter the resuable modules.
			jQuery.sap.registerModulePath("thd.recmstr", "/sap/bc/ui5_ui5/sap/ydsdrecmstr");

			var oServiceModel = this.getModel();
			// Show the user an error message if the OData service fails to initialize.
			oServiceModel.attachMetadataFailed(function(oEvent) {
				var oParams = oEvent.getParameters(),
					sResponse = oParams.responseText || oParams.response.responseText;
				this._showMetadataError(sResponse);
			}, this);

			// Handle all of the "default" OData model's Technical exceptions in one place.
			oServiceModel.attachRequestFailed(function(oEvent) {
				var mError = oEvent.getParameter("response");
				this._processFailedRequest(mError);
			}, this);

			// Bind the language specific text resource bundle.
			this._oResourceBundle = this.getModel("i18n").getResourceBundle();

			// Set the device model
			var oDeviceModel = new JSONModel(Device);
			oDeviceModel.setDefaultBindingMode("OneWay");
			this.setModel(oDeviceModel, "device");

			// Create the cross app navigation interface (for Fiori Launchpad only).
			var bIsFiori = sap.ushell ? sap.ushell.Container ? true : false : false;
			if (bIsFiori) {
				this._oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
				this._startupParameters = this.getComponentData().startupParameters;
			} else {
				this._oCrossAppNav = null;
			}

			// Set the "Editable" app status.
			this._isEditable = true;

			// initialize router once the OData service is initialized.
			oServiceModel.metadataLoaded().then(function() {
				this.getRouter().initialize();
			}.bind(this));
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, several app conponents are destroyed and/or deregistered.
		 * @public
		 * @override
		 */
		destroy: function() {
			// Deregister the datawedge bar code scan handler.
			if (window.datawedge) {
				window.datawedge.unregisterBarcode();
			}
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * Navigates back in the browser history, if the entry was created by this app.
		 * If not, it navigates to the Fiori Launchpad home page
		 * @override
		 * @public
		 */
		navigateBack: function() {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else if (this._oCrossAppNav) {
				// Navigate back to the FLP home view
				this._oCrossAppNav.backToPreviousApp();
			} else {
				history.go(-1);
			}
		},

		/**
		 * Navigate to the Article Lookup App using the Fiori Launchpad Cross App
		 * Navigation interface (if it is bound).
		 * @param {string} sStoreId  The Store ID of the calling app's location.
		 * @param {string} sBolId  The Waybill ID of the article being looked up
		 * @param {string} sArticleId  The Article ID of the article being looked up.
		 * @returns {boolean} True if the navigation was attempted, otherwise false.
		 * @public
		 */
		navigateToALU: function(sStoreId, sBolId, sArticleId) {
			var isOkay = this.hasOwnProperty("_oCrossAppNav");
			if (isOkay) {
				var sAction = "Y_LOOKUP&/product/" + sStoreId + "/00000000" + sArticleId + "";
				sAction += "/YCR_ST_RECVNG_BCKEND_MASTER-change/name=BOLSet/" + sStoreId + "/" + sBolId;
				try {
					this._oCrossAppNav.toExternal({
						target: {
							semanticObject: "Article",
							action: sAction
						}
					});
				} catch (e) {
					jQuery.sap.log.error('Error durring navigation to the ALU App: ' + e);
					this.showMessageBox(
						sap.m.MessageBox.Icon.Error, //icon
						"appNavigationFailed" //i18n text ID
					);
				}
			}
			return isOkay;
		},

		/**
		 * Convenience method for getting the language specific text resources.
		 * @param {string} sTextId is the I18N resource ID.
		 * @param {array} aVars are the variables to be inserted into the text.
		 * @public
		 * @returns {string} the language specific text requested.
		 */
		getText: function(sTextId, aVars) {
			var sText = "";
			if (aVars && aVars.length > 0) {
				sText = this._oResourceBundle.getText(sTextId, aVars);
			} else {
				sText = this._oResourceBundle.getText(sTextId);
			}
			return sText;
		},

		/**
		 * @returns {boolean} true if the app is in edit mode, otherwise false.
		 * @public
		 */
		getEditable: function() {
			return this._isEditable;
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} CSS class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no CSS class should be set.
		 */
		getContentDensityClass: function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},

		/**
		 * Set the Scan Listener ID to use for scaned input.
		 * @param {string} sId The ID of the (prevously) bound Listener for the scanned input.
		 * @public
		 */
		_sScanId: "BOL",
		setScanId: function(sId) {
			this._sScanId = sId || "";
		},

		/**
		 * Get the Scan listener ID in use for scaned input.
		 * @returns {string} The ID of the (prevously) bound Listener for the scanned input.
		 * @public
		 */
		getScanId: function() {
			return this._sScanId;
		},

		/**
		 * Bind the hardware scan input listener. The binding is only needed once.
		 * @param {object} oInput object to receive the scaned value.
		 * @public
		 */
		_oScanListeners: {},
		bindScanListener: function(oListener) {
			this._oScanListeners[oListener.id] = oListener;
		},

		/**
		 * Register the callback for the DataWedge barcode API.
		 * @private
		 */
		_registerForBarcode: function() {
			if (window.datawedge) {
				window.datawedge.registerForBarcode(function(oData) {
					if (this._sScanId) {
						if (this._oScanListeners.hasOwnProperty(this._sScanId) && this._oScanListeners[this._sScanId]) {
							var oListener = this._oScanListeners[this._sScanId];
							if (oListener.hasOwnProperty("onScan")) {
								oListener.onScan(oData.barcode);
							}
						}
					} else {
						jQuery.sap.log.warning("Barcode scan NO INPUT - Type: " + oData.type + ", Code: " + oData.barcode);
					}
				}.bind(this));
			} else if (window.cordova && window.cordova.plugins.hasOwnProperty("barcodeScanner")) {
				this._cameraScanner = function() {
					if (this._sScanId) {
						window.cordova.plugins.barcodeScanner.scan(
							function(oData) { // Success
								if (this._sScanId) {
									if (this._oScanListeners.hasOwnProperty(this._sScanId) && this._oScanListeners[this._sScanId]) {
										var oListener = this._oScanListeners[this._sScanId];
										if (oListener.hasOwnProperty("onScan")) {
											oListener.onScan(oData.text);
										}
									}
								} else {
									console.warn("Barcode scan NO INPUT - Format: " + oData.format + ", Text: " + oData.text);
								}
							}.bind(this),
							function(oError) { // Fail
								/*eslint no-console: "error"*/
								jQuery.sap.log.error("Barcode scan failed: " + JSON.stringify(oError));
							}
						);
					} else {
						jQuery.sap.log.warning("No listener bound to camera barcode scan function.");
					}
				};
			} else {
				jQuery.sap.log.warning("No barcode scan functionality available.");
			}
			return typeof this._cameraScanner === "function";
		},

		/**
		 * Shows a {@link sap.m.MessageBox} when the metadata call has failed.
		 * The user can try to refresh the metadata.
		 * @param {string} sResponse the OData response from the request.
		 * @private
		 */
		_showMetadataError: function(sResponse) {
			MessageBox.error(this.getText("ErrorHandler_serviceError"), {
				details: sResponse,
				styleClass: this.getContentDensityClass(),
				actions: [MessageBox.Action.RETRY, MessageBox.Action.CLOSE],
				onClose: function(sAction) {
					if (sAction === MessageBox.Action.RETRY) {
						this._oModel.refreshMetadata();
					}
				}.bind(this)
			});
		},

		/**
		 * If an entity that was not found in the service definition durring navigation,
		 * the server will throw a 404 (Not Found) error.  We should skip handling it
		 * here as we already cover this scenario with a "notFound" router target.
		 * However, a request that cannot be sent to the server is a technical error
		 * and we have to handle it here.
		 * @param {object} oError is the event object returned from the OData Model "error" event.
		 * @private
		 */
		_processFailedRequest: function(oError) {
			if (oError.statusCode !== "404" ||
				(oError.statusCode === 404 &&
					oError.responseText.indexOf("Cannot POST") === 0)) {
				try {
					var sResponse = oError.responseText,
						oResponse = JSON.parse(sResponse);
				} catch (e) {
					oResponse = {
						error: {
							message: {
								value: this.getText("ErrorHandler_requestFailed")
							},
							innererror: {
								errordetails: [{
									message: sResponse
								}]
							}
						}
					};
				}
				this._showServiceError(oResponse);
			}
		},

		/**
		 * Shows a {@link sap.m.MessageBox} when a service call has failed.
		 * Only the first error message will be display.
		 * @param {map} oResponse a technical error to be displayed on request
		 * @private
		 */
		_showServiceError: function(oResponse) {
			// Remove duplate messages w/out changing the order.
			var _fnRemoveDuplicates = function(aInput) {
				var aOutput = [],
					oTemp = {};
				for (var i = 0; i < aInput.length; i++) {
					oTemp[aInput[i].message] = aInput[i];
				}
				for (var sProperty in oTemp) {
					aOutput.push(oTemp[sProperty]);
				}
				return aOutput;
			};

			if (this._bMessageOpen) {
				return;
			}
			this._bMessageOpen = true;

			var sMessage = "",
				sDetails = "",
				aMessages = [];
			if (typeof oResponse !== "string") {
				sMessage = oResponse.error.message.value;
				sDetails = "";
				aMessages = oResponse.error.innererror.errordetails;
			} else {
				sMessage = oResponse;
			}
			if (aMessages) {
				aMessages = _fnRemoveDuplicates(aMessages);
				var iLineNbr = 0;
				aMessages.forEach(function(mError) {
					if (mError.hasOwnProperty("message") && mError.message && sMessage !== mError.message) {
						var aErrMsg = mError.message.split("~"),
							sErrorMessage = "";
						if (aErrMsg.length > 1) {
							sErrorMessage = aErrMsg[1];
						} else {
							sErrorMessage = mError.message;
						}
						iLineNbr += 1;
						if (mError.severity) {
							sDetails += (iLineNbr).toString() + ") [" + mError.severity + "] " + sErrorMessage + "\n";
						} else {
							sDetails += (iLineNbr).toString() + ") " + sErrorMessage + "\n";
						}
					}
				});
			}

			if (!sDetails) {
				//	sDetails = this.getText("ErrorHandler_noFurtherInfo");
				MessageBox.error(sMessage, {
					// details : sDetails,
					styleClass: this.getContentDensityClass(),
					actions: [MessageBox.Action.CLOSE],
					initialFocus: MessageBox.Action.CLOSE,
					onClose: function() {
						this._bMessageOpen = false;
					}.bind(this)
				});
			} else {
				MessageBox.error(sMessage, {
					details: sDetails,
					styleClass: this.getContentDensityClass(),
					actions: [MessageBox.Action.CLOSE],
					initialFocus: MessageBox.Action.CLOSE,
					onClose: function() {
						this._bMessageOpen = false;
					}.bind(this)
				});
			}
		}
	});
});