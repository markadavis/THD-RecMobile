sap.ui.define([
		"sap/ui/base/Object",
		"sap/ui/Device",
		"thd/recmobile/util/formatter"
	], function(BaseObject, Device, formatter) {
		"use strict";

		return BaseObject.extend("thd.recmobile.component.reportIssue.ReportIssue", {

			formatter: formatter,

			/**
			 * Provides a convenience API for Report Issue popover. All the functions will
			 * wait until the initial load of the popover passed to the instance by the
			 * bindDialog function.
			 * @param {sap.ui.core.mvc.Controller} oController is the owner of the component.
			 * @class
			 * @public
			 * @alias thd.recmobile.component.reportIssue.ReportIssue
			 */
			constructor: function(oController) {
				this._oController = oController;
				this._oComponent = this._oController.getOwnerComponent();
				this._oModel = this._oController.getOwnerComponent().getModel();
				this._i18n = this._oComponent.getModel("i18n");
				this._oView = this._oController.getView();
				this._sDialogIdPrefix = this._oController.getView().getId();
				this._sDialogId = "";
				this._oDialog = null;
				this._oSourceBtn = null;
				this._sSourceBtnType = "";
				this._sEventId = "Cancel";
				this._mExceptionKey = {};
				this._mExceptionRecord = {
					StoreID: "",
					WayBillNbr: "",
					Pallet: "",
					PONbr: "",
					ItemID: "",
					Article: "",
					Type: "",
					Text: ""
				};
			},

			/**
			 * The component is destroyed by UI5 automatically.
			 * In this method, several app conponents are destroyed and/or deregistered.
			 * @public
			 * @override
			 */
			destroy : function () {
				if (this._oDialog) {
					this._oDialog.destroy();
				}
				BaseObject.prototype.destroy.apply(this, arguments);
			},


			/* =========================================================== */
			/* Begin: Helper methods                                       */
			/* =========================================================== */

			/**
			 * Convenience method for getting the resource bundle.
			 * @public
			 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
			 */
			getResourceBundle : function () {
				return this._i18n.getResourceBundle();
			},

			/**
			 * Bind the Report Issue popover to the API.
			 * @returns {sap.m.ResponsivePopover} the Report Issue popover
			 * @public
			 */
			bindDialog : function () {
				if (!this._oDialog) {
					if (this._sDialogId) {
						this._oDialog = sap.ui.getCore().byId(this._sDialogId);
					}
					if (!this._oDialog) {
						// Construct and bind the Dialog.
						this._oDialog = sap.ui.xmlfragment(
							this._sDialogIdPrefix,
							"thd.recmobile.component.reportIssue.ReportIssue",
							this
						);
						this._sDialogId = this._oDialog.getId();
						this._oDialog.setBusyIndicatorDelay(0);
						this._oDialog.setModel(this._oModel);
						this._oDialog.setModel(this._oComponent.getModel("i18n"), "i18n");
					}
				}

				return this._oDialog;
			},

			/**
			 * Has the Report Issue popover been bound?
			 * @returns {boolean} True if the Report Issue popover is bound.
			 * @public
			 */
			 isBound : function () {
			 	return this._oDialog ? true : false;
			 },

			/**
			 * Open the Popover to collect the Exception information.
			 * @param {sap.m.Button} oSourceBtn is the Button mapped to the popover.
			 * @param {map} mExceptionKey is the key for the Exception data.
			 * @param {string} sType is the default Exception Type - if used, the field will be disabled.
			 *			{array} sType if an array is passed in, the values of the array will be excluded
			 *					from the available list of Exception Types.
			 * @param {function} fnCallBack is the call-back function and it sends true if canceled.
			 * @param {boolean} bDisplayOnly turns on/off the inputs of the dialog.
			 * @public
			 */
			 openDialog : function (oSourceBtn, mExceptionKey, sType, fnCallBack, bDisplayOnly) {
			 	var aExceptionTypes = this._oController.getModel("exceptionTypeSet").getData();
				this._oSourceBtn = oSourceBtn;
				this._sSourceBtnType = this._oSourceBtn.getType();
				this._sType = sType ? sType.constructor === Array ? "" : sType : "";
				this._aExcluedTypes = sType ? sType.constructor === Array ? sType : [] : [];
				this._fnCallBack = fnCallBack;
				this._mExceptionKey = mExceptionKey;
				for (var sProperty in mExceptionKey) {
					if (this._mExceptionRecord.hasOwnProperty(sProperty) && mExceptionKey[sProperty]) {
						this._mExceptionRecord[sProperty] = mExceptionKey[sProperty];
					}
				}

				// Try to read the data from the oData model for the requested Exception Key.
				var sStoreId = this.formatter.addLeadingZeros(this._mExceptionRecord.StoreID,4),
					sItemId = this.formatter.addLeadingZeros(this._mExceptionRecord.ItemID,5);
				this._sPath = this._oModel.createKey("/ExceptionSet", {
					StoreID: sStoreId,
					WayBillNbr: this._mExceptionRecord.WayBillNbr,
					Pallet: this._mExceptionRecord.Pallet,
					PONbr: this._mExceptionRecord.PONbr,
					ItemID: sItemId,
					Article: this._mExceptionRecord.Article
				});

				var oData = this._oModel.getObject(this._sPath);

				// Set issues types model's data.
				var aTypes = [];
				if (this._aExcluedTypes.length > 0) {
					for (var i = 0; i < aExceptionTypes.length; i++) {
						var bAdd = true,
							that = this;
						this._aExcluedTypes.forEach(function(sCode) {
							if (aExceptionTypes[i].TypeCode === sCode) {
								bAdd = false;
							}
						});
						if (bAdd) {
							aTypes.push(aExceptionTypes[i]);
						}
					}
				} else if (this._sType) {
					var sTy = this._sType;
					aTypes = jQuery.grep(aExceptionTypes, function(oTy){
						return oTy.TypeCode === sTy;
					});
				} else {
					aTypes = aExceptionTypes;
				}
				var bHasQty = false,
					sCheckType = oData ? oData.Type : this._sType ? this._sType : "";
				if (sCheckType === "1--" || sCheckType === "402" || sCheckType === "403") {
					bHasQty = true;
				}

				// Create and bind the augmented (and filtered) "Issue Types" model to the dialog.
				this._oDialog.setModel(new sap.ui.model.json.JSONModel({
					ExceptionTypeSet: aTypes,
					hasQty: bHasQty,
					displayOnly: bDisplayOnly || false
				}), "dialogVars");

				if (!oData && bDisplayOnly) {
					this._oController.showMessageBox(
						sap.m.MessageBox.Icon.INFORMATION,	// icon
						"ReportIssue_NoIssues",	//i18n text ID
						[]	// Text arguments
					);
					this._closeDialog(true);
					return;
				}
				this._oDialog.bindElement(this._sPath);

				// Remove the assigned search field for scanner input.
				this._sScanId = this._oComponent.getScanId();
				this._oComponent.setScanId("");

				// Open the popover
				this._oDialog.openBy(this._oSourceBtn);

				// Set the Cancel button (non-destructive) as the default button.
				var sIdDeclineBtn = this._oView.byId("idDialogCollectIssueReportDeclineBtn").getId();
				jQuery.sap.delayedCall(500, this, function() {
					$("#" + sIdDeclineBtn).focus();
				});
			 },



			/* =========================================================== */
			/* Begin: View Formatter methods                               */
			/* =========================================================== */

			


			/* =========================================================== */
			/* Begin: Event handler methods                                */
			/* =========================================================== */

			/**
			 * Update UI properties based on the selected Exception Type
			 * @param {sap.ui.base.Event} oEvent button event object.
			 * @public
			 */
			onTypeChange : function(oEvent) {
				var oData = this._oDialog.getModel("dialogVars").getData(),
					sSelectedKey = oEvent.getSource().getSelectedKey();
				if (sSelectedKey === "1--" || sSelectedKey === "402" || sSelectedKey === "403") {	// Damaged, Shortage, Overage
					oData.Qty = "";
				}

				// Display the Quantity field, if needed.
				if (sSelectedKey === "1--" || sSelectedKey === "402" || sSelectedKey === "403") {
					oData.hasQty = true;
				} else {
					// Clear the Quantity Value
					this._oView.byId("idDialogCollectIssueReportQty").setValue();
					// Hide the Quantity  field
					oData.hasQty = false;
				}
				this._oDialog.getModel("dialogVars").setData(oData);
			},

			/**
			 * This method is bound to the popover's "Save" button press event.
			 * @param {sap.ui.base.Event} oEvent button event object.
			 * @public
			 */
			onSaveBtn : function (oEvent) {
				var sTypeCode = this._oView.byId("idDialogCollectIssueReportType").getSelectedKey(),
					bQtyIsVisible = this._oView.byId("idDialogCollectIssueReportQty").getVisible(),
					sQty = this._oView.byId("idDialogCollectIssueReportQty").getValue().match(/^[0-9.]+$/),
					sText = this._oView.byId("idDialogCollectIssueReportText").getValue();

				if (sTypeCode === "") {
					sap.m.MessageToast.show(
						this.getResourceBundle().getText("ReportIssue_TypeRequired"),
						{duration: 3000}
					);
				} else if (sText === "") {
					sap.m.MessageToast.show(
						this.getResourceBundle().getText("ReportIssue_TextRequired"),
						{duration: 3000}
					);
				} else if (bQtyIsVisible && (!sQty || (parseInt(sQty,10) === 0))) {
					sap.m.MessageToast.show(
						this.getResourceBundle().getText("ReportIssue_QtyRequired"),
						{duration: 3000}
					);
				} else {
					this._postExceptionDetails();
				}
			},

			 /**
			  * Cancel popover button event handler - close the Report Issue popover.
			  * @public
			  */
			onCancelBtn : function (oEvent) {
				// Close the dialog.
				this._oDialog.close();
			},

			onAfterClose : function(oEvent) {
				var bCancel = this._sEventId === "Save" ? false : true;
				this._closeDialog(bCancel);
			},



			/* =========================================================== */
			/* Begin: Private methods                                      */
			/* =========================================================== */

			/**
			 * Close the popover and clean up the component's context.
			 * @private
			 */
			 _closeDialog : function (bCancel) {
				// Remove any pending changes from the OData model.
				var oChangeContext = this._oModel.getContext(this._sPath);
				if (oChangeContext) {
					if (this._oModel.getPendingChanges().hasOwnProperty(this._sPath.split("/")[1])) {
						this._oModel.deleteCreatedEntry(oChangeContext);
					}
				}

				// Remove the data binding.
				this._oDialog.unbindElement(this._sPath);

			 	// Clean up the context.
				this._oView.byId("idDialogCollectIssueReportType").setSelectedKey();
				this._oView.byId("idDialogCollectIssueReportQty").setValue();
				this._oView.byId("idDialogCollectIssueReportQty").setValue();
				this._oView.byId("idDialogCollectIssueReportText").setValue();
				if (this._oSourceBtn.getType() !== "Reject") {	// Driver Check-In
					this._oSourceBtn.setType(this._sSourceBtnType);
				}
				this._oSourceBtn = null;
				this._sSourceBtnType = "";
				this._sPath = "";
				this._sType = "";
				this._sEventId = "Cancel";
				this._mExceptionKey = {};
				for (var sProperty in this._mExceptionRecord) {
					this._mExceptionRecord[sProperty] = "";
				}

				// Reassign the assigned search field for scanner input.
				this._oComponent.setScanId(this._sScanId);
				this._sScanId = "";

				// Dismiss the popover
				// this._oDialog.close();

				// Call the call-back listener (if given).
				if (this._fnCallBack) {
					this._fnCallBack(bCancel);
				}
			 },

			/**
			 * Post the Exception information (OData.update).
			 * @private
			 */
			_postExceptionDetails : function () {
				var that = this,
					// oCore = sap.ui.getCore(),
					oEntity = this._oModel.getObject(this._sPath);

				var sTypeCode = this._oView.byId("idDialogCollectIssueReportType").getSelectedKey(),
					sText = this._oView.byId("idDialogCollectIssueReportText").getValue(),
					sQty = this._oView.byId("idDialogCollectIssueReportQty").getValue();

				// Call the update/create CRUD method on the OData service.
				this._oDialog.setBusy(true);
				if (oEntity) {
					// Update
					oEntity.Type = sTypeCode;
					oEntity.Text = sText;
					oEntity.Qty = isNaN(sQty) ? "0" : Number(sQty).toString();
					this._oModel.update(this._sPath, oEntity, {
						groupId: "ExceptionSet",
						success: function(oData) {
							// Update the button type (decoration).
							that._sSourceBtnType = sap.m.ButtonType.Emphasized;
							that._sEventId = "Save";
							// Remove the busy overlay and dismiss the popover.
							that._oDialog.setBusy(false);
							// Close
							that._oDialog.close();
						},
						error: function(oResponse) {
							// Remove the busy overlay.
							that._oDialog.setBusy(false);
						}
					});
				} else {
					//Create
					oEntity = jQuery.extend({}, this._mExceptionRecord);
					oEntity.Type = sTypeCode;
					oEntity.Text = sText;
					oEntity.Qty = isNaN(sQty) ? "0" : Number(sQty).toString();
					this._oModel.create("/ExceptionSet", oEntity, {
						groupId: "ExceptionSet",
						success: function(oData) {
							// Update the button type (decoration).
							that._sSourceBtnType = sap.m.ButtonType.Emphasized;
							that._sEventId = "Save";
							// Remove the busy overlay and dismiss the popover.
							that._oDialog.setBusy(false);
							// Update the issue count on the header Model.
							var oDetailViewModel = that._oController.getModel("detailView");
							if (oDetailViewModel) {
								var iCount = oDetailViewModel.getProperty("/IssueCount");
								oDetailViewModel.setProperty("/IssueCount", iCount + 1);
							}
							// Close
							that._oDialog.close();
						},
						error: function(oResponse) {
							// Remove the busy overlay.
							that._oDialog.setBusy(false);
						}
					});
				}
			}
		});
	}
);