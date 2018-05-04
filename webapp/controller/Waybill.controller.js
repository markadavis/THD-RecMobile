sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"thd/recmstr/module/driverCheckIn/DriverCheckIn",
	"thd/recmobile/util/formatter"
], function(Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, DriverCheckIn, formatter) {
	"use strict";
	return Controller.extend("thd.recmobile.controller.Waybill", {
		formatter : formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event
		 * handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit : function () {
			this._oHistory = sap.ui.core.routing.History.getInstance();
			this._oComponent = this.getOwnerComponent();
			this._oServiceModel = this._oComponent.getModel();
			this._oView = this.getView();
			this.formatter.bindComponent(this);
			var iOriginalDelay = this._oView.byId("idWaybillPage").getBusyIndicatorDelay(),
				oViewData = {
					settings: {
						busy : false,
						delay : iOriginalDelay,
						originalDelay: iOriginalDelay
					},
					data: {
						Waybill: {},
						IssueCount: 0,
						Issues: [],
						PalletRGRCount: 0,
						PalletDGRCount: 0,
						PalletReceivedCount: 0,
						AllPallets: [],
						RGRPallets: [],
						DGRPallets: [],
						ReceivedPallets: [],
						PORGRCount: 0,
						PODGRCount: 0,
						POReceivedCount: 0,
						AllPOs: [],
						RGRPOs: [],
						DGRPOs: [],
						ReceivedPOs: []
					}
				},
				oViewModel = new JSONModel(oViewData);

			// Set the Waybill view's model.
			this._oComponent.setModel(oViewModel, "waybillView");

			// Subscribe the view to the Scan event (Pallets/POs).
			this._oComponent.bindScanListener({
				id: "WAYBILL",
				onScan: function(sBarCode) {
					this._performSearch(sBarCode);
				}.bind(this)
			});

			// Bind the Driver Check-In component.
			new DriverCheckIn(this).then(function(oDriverCheckIn) {
				this._driverCheckIn = oDriverCheckIn;
			}.bind(this));

			// Register an event handler for navigation to this view.
			this._oComponent.getRouter().attachRoutePatternMatched(this._onRoutePatternMatched, this);
		},

		/**
		 * This method is called every time the View is rendered, after the HTML is placed in the
		 * DOM-Tree. It can be used to apply additional changes to the DOM after the Renderer has
		 * finished. (Even though this method is declared as "abstract", it does not need to be
		 * defined in controllers, if the method does not exist, it will simply not be called.)
		 * @public
		 */
		//onAfterRendering : function () {},

		/**
		 * This method is called every time the View is rendered, before the Renderer is called
		 * and the HTML is placed in the DOM-Tree. It can be used to perform clean-up-tasks before
		 * re-rendering. (Even though this method is declared as "abstract", it does not need to
		 * be defined in controllers, if the method does not exist, it will simply not be called.)
		 */
		//onBeforeRendering : function() {},

		/**
		 * This method is called upon desctuction of the View. The controller should perform its
		 * internal destruction in this hook. It is only called once per View instance, unlike the
		 * onBeforeRendering and onAfterRendering hooks. (Even though this method is declared as
		 * "abstract", it does not need to be defined in controllers, if the method does not exist,
		 * it will simply not be called.)
		 * @public
		 */
		onExit : function () {
			// Destroy all of the locally constructed components.
			if (this._oPalletDialog) {
				this._oPalletDialog.destroy();
			}
			if (this._oPODialog) {
				this._oPODialog.destroy();
			}
			if (this._driverCheckIn) {
				this._driverCheckIn.destroy();
			}

			// Un-Assign the Pallet/PO search to the Scan event.
			this._oComponent.setScanId("");
		},



		/* =========================================================== */
		/* event handler methods                                       */
		/* =========================================================== */

		/**
		 * Handle the "Back" navigation header button press event.
		 * @public
		 */
		onNavButtonPress : function () {
			this._oComponent.navigateBack();         
		},

		/**
		 * Called when the "Expand" event is fired on the header panel (expand button).
		 * @param {sap.ui.base.Event} oEvent header expand event object.
		 * @public
		 */
		onDetailHeaderExpand : function(oEvent) {
			if (oEvent.getId() !== "expand") {
				var oPanel = this._oView.byId("idWaybillPanel");
				oPanel.setExpanded(!oPanel.getExpanded());
			} else {
			// Wait until the panel open/close animation completes, then recalculate
			// the detail view scroller area.
			jQuery.sap.delayedCall(750, this, this._setListScrollerHeight);
			}
		},

		/**
		 * Handle the Driver Check-In button press event.
		 * @param {sap.ui.base.Event} oEvent button press event object.
		 * @public
		 */
		onCheckInPress : function (oEvent) {
			var oWaybill = this._oComponent.getModel("waybillView").getProperty("/data/Waybill"),
				bEditable = this._oComponent.getEditable();
			this._driverCheckIn.openDialog(oWaybill, bEditable);
		},

		/**
		 * Waybill list Tab Bar "filter" press event handler - sets the list view.
		 * @param {sap.ui.base.Event} oEvent Tab Bar selected event object.
		 * @public
		 */
		onTabBarSelect : function (oEvent) {
			this._setListScrollerHeight();
		},

		/**
		 * Waybill list update event handler - called when bindings change on a list.
		 * @param {sap.ui.base.Event} oEvent Tab Bar selected event object.
		 * @public
		 */
		onListUpdate : function (oEvent) {
			this._setListScrollerHeight();
		},

		/**
		 * Waybill list toolbar button event handler - Open the "All Pallets" dialog.
		 * @param {sap.ui.base.Event} oEvent "Show All Pallets" button event object.
		 * @public
		 */
		onShowAll : function (oEvent) {
			var oWaybill = this._oComponent.getModel("waybillView").getProperty("/data/Waybill");
			if (oWaybill.Seal === "X") {
				if (!this._oPalletListDialog) {
					// Bind the Pallet List Dialog.
					this.initPalletListDialog();
				}
				this._oPalletListDialog.open();
			} else {
				if (!this._oPOListDialog) {
					// Bind the PO List Dialog.
					this.initPOListDialog();
				}
				this._oPOListDialog.open();
			}
		},

		/**
		 * Appliy a fiter to the currently selected list (Tab Bar).
		 * @param {sap.ui.base.Event} oEvent Search button event object.
		 * @public
		 */
		onFilter : function(oEvent) {
			var oTabBar = null,
				oTabBarPallet = this._oView.byId("idWaybillPageTabBarPallet");

			if (oTabBarPallet.getVisible()) {
				oTabBar = oTabBarPallet;
			} else {
				oTabBar = this._oView.byId("idWaybillPageTabBarPO");
			}

			var sQuery = oEvent.getParameter("query"),
				sSelectedTab = oTabBar.getSelectedKey(),
				oList = this._oView.byId("idWaybillPagePallet" + sSelectedTab + "List");
			if (sQuery) {
				oList.getBinding("items").filter(
					new Filter([
						new Filter("PalletID", FilterOperator.Contains, sQuery.toUpperCase())
					], false) // -or-
				);
			} else {
				oList.getBinding("items").filter();
			}
		},

		/**
		 * Handle the (mobile device) camera scanner button press event.
		 * @param {sap.ui.base.Event} oEvent Camera Scanner button press event object.
		 * @public
		 */
		onCameraScanner : function (oEvent) {
			if (typeof this._oComponent._cameraScanner === "function") {
				this._oComponent._cameraScanner();
			}
		},
		/**
		 * Find a Pallet or PO from the query string entered.
		 * @param {sap.ui.base.Event} oEvent Search button event object.
		 * @public
		 */
		onSelect : function (oEvent) {
			var sKeys = "{" + oEvent.getParameter("listItem").getCustomData()[0].getProperty("value").replace(/'/g, '"') + "}",
				mKey = JSON.parse(sKeys),
				sQuery = "";
			if (mKey.Seal === "X") {
				sQuery = mKey.PalletID;
			} else {
				sQuery = mKey.PONbr;
			}
			oEvent.getSource().removeSelections();
			if (sQuery) {
				this._performSearch(sQuery);
			}
		},







		/* ********************************************* */
		// TODO - Make Component for Pallet Detail Dialog.
		/* ********************************************* */
		initPalletDialog : function () {
			// Construct and bind the Dialog.
			this._oPalletDialog = sap.ui.xmlfragment(
				this._oView.getId(),
				"thd.recmobile.viewFragment.PalletDialog",
				this
			);
			this._sPalletDialogId = this._oPalletDialog.getId();
			this._sPalletDialogCallerScanId= "";

			// Bind the I18N model.
			this._oPalletDialog.setModel(new JSONModel({}));
			this._oPalletDialog.setModel(this._oComponent.getModel("i18n"), "i18n");

			// Bind the dialog's data
			this._oPalletDialog.bindObject("/");
		},
		onPalletDialogOpen : function (oEvent) {
			// Un-Assign the search to the Scan event.
			this._sPalletDialogCallerScanId = this._oComponent.getScanId();
			this._oComponent.setScanId("");
		},
		onPalletDialogIssues : function (oEvent) {
			// TODO - open the Report Issue dialog.
		},
		onPalletDialogRGR : function (oEvent) {

			// If the pallet is being processed, just return.
			var oPallet = this._oPalletDialog.getModel().getData();
			if (oPallet.hasOwnProperty("isBusy")) {
				MessageToast.show(this._oComponent.getText("WaybillRGR_PalletInProcess"));
				return;
			}

			// Get a copy o the Pallet to send to the OData service before adding the "isBus" property.
			var oPalletToRGR = jQuery.extend({}, oPallet);
			
			// Update the RGR model to set the busy overlay.
			var aRGRPallets = this._oComponent.getModel("waybillView").getProperty("/data/RGRPallets");
			for (var i = 0; i < aRGRPallets.length; i++) {
				if (aRGRPallets[i].PalletID === oPallet.PalletID) {
					oPallet.isBusy = true;
					aRGRPallets[i] = oPallet;
					break;
				}
			}
			this._oComponent.getModel("waybillView").setProperty("/data/RGRPallets", aRGRPallets);

			// Submit the pallet for RGR (auto-DGR).
			var sPath = this._oServiceModel.createKey("/PalletHeaderSet", {
					StoreID: oPallet.StoreID,
					WayBillNbr: oPallet.WayBillNbr,
					PalletID: oPallet.PalletID
				});
			this._oServiceModel.update(sPath, oPalletToRGR, {
				groupId: "PalletRGR",
				success: function(oData, oResponse) {
					var oSuccessPallet = this._oServiceModel.getProperty(sPath);
					oSuccessPallet.PalletStatus = "X";	// Completely Received
	
					// Toast the successful RGR (auto-DGR);
					MessageToast.show(this._oComponent.getText("WaybillRGR_PalletDGRSuccess",[oSuccessPallet.PalletID]),{duration: 1000});

					// Update the pallet in the "All Pallets" model with the "Completely Received" status.
					var aAll = this._oComponent.getModel("waybillView").getProperty("/data/AllPallets");
					for (var ia = 0; ia < aAll.length; ia++) {
						if (aAll[ia].PalletID === oSuccessPallet.PalletID) {
							aAll[ia] = oSuccessPallet;
							break;
						}
					}
					this._oComponent.getModel("waybillView").setProperty("/data/AllPallets", aAll);

					// Add the pallet to the "Completely Received" model (this will also remove the isBusy flag).
					var aReceived = this._oComponent.getModel("waybillView").getProperty("/data/ReceivedPallets");
					aReceived.push(oSuccessPallet);
					this._oComponent.getModel("waybillView").setProperty("/data/ReceivedPallets", aReceived);

					// Set the Received Pallet Tab Bar count.
					this._oComponent.getModel("waybillView").setProperty("/data/PalletReceivedCount", aReceived.length.toString());

					// Remove the pallet from the RGR model.
					var aRGR = this._oComponent.getModel("waybillView").getProperty("/data/RGRPallets"),
						aNewRGR = aRGR.filter(function(oPalletToTest) {
							return oPalletToTest.PalletID !== oSuccessPallet.PalletID;
						});
					this._oComponent.getModel("waybillView").setProperty("/data/RGRPallets", aNewRGR);

					// Set the RGR Pallet Tab Bar count.
					this._oComponent.getModel("waybillView").setProperty("/data/PalletRGRCount", aNewRGR.length.toString());

					// Update the Waybill staus (if we are all done).
					var aDGR = this._oComponent.getModel("waybillView").getProperty("/data/DGRPallets");
					if (aNewRGR.length === 0 && aDGR.length === 0) {
						this._oComponent.getModel("waybillView").setProperty("/data/Waybill/EntryStatus", "C");
						this._oComponent.getModel("waybillView").setProperty("/data/Waybill/ActionCode", "04");
					}
				}.bind(this),
				error: function(oError) {
					var oFailedPallet = this._oServiceModel.getProperty(sPath),
						aRGR = [];
					if (oError.statusCode < 500)  {	// These ~should~ be Auto-DGR failures.
						// TODO - Check the error type to see if the RGR was successful (aka - errors are from DGR).

						oFailedPallet.PalletStatus = "R";	// Needs DGR

						// Update the pallet in the "All Pallets" model with the "Completely Received" status.
						var aAll = this._oComponent.getModel("waybillView").getProperty("/data/AllPallets");
						for (var ia = 0; ia < aAll.length; ia++) {
							if (aAll[ia].PalletID === oFailedPallet.PalletID) {
								aAll[ia] = oFailedPallet;
								break;
							}
						}
						this._oComponent.getModel("waybillView").setProperty("/data/AllPallets", aAll);

						// Remove the pallet from the RGR model.
						aRGR = this._oComponent.getModel("waybillView").getProperty("/data/RGRPallets");
						var aNewRGR = aRGR.filter(function(oPalletToTest) {
							return oPalletToTest.PalletID !== oFailedPallet.PalletID;
						});
						this._oComponent.getModel("waybillView").setProperty("/data/RGRPallets", aNewRGR);

						// Set the RGR Pallet Tab Bar count.
						this._oComponent.getModel("waybillView").setProperty("/data/PalletRGRCount", aNewRGR.length.toString());

						// Add the pallet in the DGR model (and update the status).
						var aDGR = this._oComponent.getModel("waybillView").getProperty("/data/DGRPallets");
						aDGR.push(oFailedPallet);
						this._oComponent.getModel("waybillView").setProperty("/data/DGRPallets", aDGR);

						// Set the DGR Pallet Tab Bar count.
						this._oComponent.getModel("waybillView").setProperty("/data/PalletDGRCount", aDGR.length.toString());

						// TODO - parse oError map to get the message.
						MessageBox.error(this._oComponent.getText("WaybillRGR_PalletDGRfailed",[oFailedPallet.PalletID]));

					} else {
						// These are technical exceptions, so the RGR did not complete successfully (no RGR ~or~ DGR).

						// TODO - parse oError map to get the message.
						MessageBox.error(this._oComponent.getText("WaybillRGR_RGRApplicationError",[oFailedPallet.PalletID]));
	
						// Remove the busy overlay from the RGR model.
						aRGR = this._oComponent.getModel("waybillView").getProperty("/data/RGRPallets");
						for (var j = 0; j < aRGR.length; j++) {
							if (aRGR[j].PalletID === oFailedPallet.PalletID) {
								delete aRGR[j].isBusy;
								break;
							}
						}
						this._oComponent.getModel("waybillView").setProperty("/data/RGRPallets", aRGR);
					}
				}.bind(this)
			});

			// Close the Pallet List Dialog.
			this._closePalletDialog();
		},
		onPalletDialogClose : function (oEvent) {
			// Close the Pallet List Dialog.
			this._closePalletDialog();
		},
		_closePalletDialog : function() {
			// Re-Assign the search to the Scan event.
			this._oComponent.setScanId(this._sPalletDialogCallerScanId);
			this._oPalletDialog.close();
		},








		/* ********************************************* */
		// TODO - Make Component for PO Detail Dialog.
		/* ********************************************* */
		initPODialog : function () {
			// Construct and bind the Dialog.
			this._oPODialog = sap.ui.xmlfragment(
				this._oView.getId(),
				"thd.recmobile.viewFragment.PODialog",
				this
			);
			this._sPODialogId = this._oPODialog.getId();
			this._sPODialogCallerScanId = "";

			// Bind the I18N model.
			this._oPODialog.setModel(new JSONModel({}));
			this._oPODialog.setModel(this._oComponent.getModel("i18n"), "i18n");

			// Bind the dialog's data
			this._oPODialog.bindObject("/");
		},
		onPODialogOpen : function (oEvent) {
			// Un-Assign the search to the Scan event.
			this._sPODialogCallerScanId = this._oComponent.getScanId();
			this._oComponent.setScanId("");
		},
		onPODialogIssues : function (oEvent) {
			// TODO - open the Report Issue dialog.
		},
		onPODialogRGR : function (oEvent) {

			// If the PO is being processed, just return.
			var oPO = this._oPODialog.getModel().getData();
			if (oPO.hasOwnProperty("isBusy")) {
				MessageToast.show(this._oComponent.getText("WaybillRGR_POInProcess"));
				return;
			}

			// Get a copy o the PO to send to the OData service before adding the "isBus" property.
			var oPOToRGR = jQuery.extend({}, oPO);
			
			// Update the RGR model to set the busy overlay.
			var aRGRPOs = this._oComponent.getModel("waybillView").getProperty("/data/RGRPOs");
			for (var i = 0; i < aRGRPOs.length; i++) {
				if (aRGRPOs[i].PONbr === oPO.PONbr) {
					oPO.isBusy = true;
					aRGRPOs[i] = oPO;
					break;
				}
			}
			this._oComponent.getModel("waybillView").setProperty("/data/RGRPOs", aRGRPOs);

			// Submit the PO for RGR (auto-DGR).
			var sPath = this._oServiceModel.createKey("/POHeaderSet", {
					StoreID: oPO.StoreID,
					WayBillNbr: oPO.WayBillNbr,
					PONbr: oPO.PONbr
				});
			this._oServiceModel.update(sPath, oPOToRGR, {
				groupId: "PORGR",
				success: function(oData, oResponse) {
					var oSuccessPO = this._oServiceModel.getProperty(sPath);
					oSuccessPO.POStatus = "X";	// Completely Received
	
					// Toast the successful RGR (auto-DGR);
					MessageToast.show(this._oComponent.getText("WaybillRGR_PODGRSuccess",[oSuccessPO.PONbr]),{duration: 1000});

					// Update the PO in the "All POs" model with the "Completely Received" status.
					var aAll = this._oComponent.getModel("waybillView").getProperty("/data/AllPOs");
					for (var ia = 0; ia < aAll.length; ia++) {
						if (aAll[ia].PONbr === oSuccessPO.PONbr) {
							aAll[ia] = oSuccessPO;
							break;
						}
					}
					this._oComponent.getModel("waybillView").setProperty("/data/AllPOs", aAll);

					// Add the PO to the "Completely Received" model (this will also remove the isBusy flag).
					var aReceived = this._oComponent.getModel("waybillView").getProperty("/data/ReceivedPOs");
					aReceived.push(oSuccessPO);
					this._oComponent.getModel("waybillView").setProperty("/data/ReceivedPOs", aReceived);

					// Set the Received PO Tab Bar count.
					this._oComponent.getModel("waybillView").setProperty("/data/POReceivedCount", aReceived.length.toString());

					// Remove the PO from the RGR model.
					var aRGR = this._oComponent.getModel("waybillView").getProperty("/data/RGRPOs"),
						aNewRGR = aRGR.filter(function(oPOToTest) {
							return oPOToTest.PONbr !== oSuccessPO.PONbr;
						});
					this._oComponent.getModel("waybillView").setProperty("/data/RGRPOs", aNewRGR);

					// Set the RGR PO Tab Bar count.
					this._oComponent.getModel("waybillView").setProperty("/data/PORGRCount", aNewRGR.length.toString());

					// Update the Waybill staus (if we are all done).
					var aDGR = this._oComponent.getModel("waybillView").getProperty("/data/DGRPOs");
					if (aNewRGR.length === 0 && aDGR.length === 0) {
						this._oComponent.getModel("waybillView").setProperty("/data/Waybill/EntryStatus", "C");
						this._oComponent.getModel("waybillView").setProperty("/data/Waybill/ActionCode", "04");
					}
				}.bind(this),
				error: function(oError) {
					var oFailedPO = this._oServiceModel.getProperty(sPath),
						aRGR = [];
					if (oError.statusCode < 500)  {	// These ~should~ be Auto-DGR failures.
						// TODO - Check the error type to see if the RGR was successful (aka - errors are from DGR).

						oFailedPO.POStatus = "R";	// Needs DGR

						// Update the PO in the "All POs" model with the "Completely Received" status.
						var aAll = this._oComponent.getModel("waybillView").getProperty("/data/AllPOs");
						for (var ia = 0; ia < aAll.length; ia++) {
							if (aAll[ia].PONbr === oFailedPO.PONbr) {
								aAll[ia] = oFailedPO;
								break;
							}
						}
						this._oComponent.getModel("waybillView").setProperty("/data/AllPOs", aAll);

						// Remove the PO from the RGR model.
						aRGR = this._oComponent.getModel("waybillView").getProperty("/data/RGRPOs");
						var aNewRGR = aRGR.filter(function(oPOToTest) {
							return oPOToTest.PONbr !== oFailedPO.PONbr;
						});
						this._oComponent.getModel("waybillView").setProperty("/data/RGRPOs", aNewRGR);

						// Set the RGR PO Tab Bar count.
						this._oComponent.getModel("waybillView").setProperty("/data/PORGRCount", aNewRGR.length.toString());

						// Add the PO in the DGR model (and update the status).
						var aDGR = this._oComponent.getModel("waybillView").getProperty("/data/DGRPOs");
						aDGR.push(oFailedPO);
						this._oComponent.getModel("waybillView").setProperty("/data/DGRPOs", aDGR);

						// Set the DGR PO Tab Bar count.
						this._oComponent.getModel("waybillView").setProperty("/data/PODGRCount", aDGR.length.toString());

						// TODO - parse oError map to get the message.
						MessageBox.error(this._oComponent.getText("WaybillRGR_PODGRfailed",[oFailedPO.PONbr]));

					} else {
						// These are technical exceptions, so the RGR did not complete successfully (no RGR ~or~ DGR).

						// TODO - parse oError map to get the message.
						MessageBox.error(this._oComponent.getText("WaybillRGR_RGRApplicationError",[oFailedPO.PONbr]));
	
						// Remove the busy overlay from the RGR model.
						aRGR = this._oComponent.getModel("waybillView").getProperty("/data/RGRPOs");
						for (var j = 0; j < aRGR.length; j++) {
							if (aRGR[j].PONbr === oFailedPO.PONbr) {
								delete aRGR[j].isBusy;
								break;
							}
						}
						this._oComponent.getModel("waybillView").setProperty("/data/RGRPOs", aRGR);
					}
				}.bind(this)
			});

			// Close the PO List Dialog.
			this._closePODialog();
		},
		onPODialogClose : function (oEvent) {
			// Close the PO List Dialog.
			this._closePODialog();
		},
		_closePODialog : function() {
			// Re-Assign the search to the Scan event.
			this._oComponent.setScanId(this._sPODialogCallerScanId);
			this._oPODialog.close();
		},







		/* =========================================================== */
		/* Begin: helper methods                                       */
		/* =========================================================== */

		/**
		 * @public
		 */
		formatScheduledDateTimeStamp: function(dValue) {
			return this.formatter.formatDateTime(dValue, true);	// Without time
		},

		/**
		 * @public
		 */
		formatArrivedDateTimeStamp: function(dValue) {
			var sDate = this.formatter.formatDateTime(dValue, false);	// With time
			if (!sDate) {
				sDate = this._oComponent.getText("WaybillPanel_HeaderLabelNotArrived");                              
			}
			return sDate;
		},

		/**
		 * Set the "width" property of the Pallet ID field based on it's length.
		 * @param {string} sId is the pallet being to considered.
		 * @returns {string} CSS with in em.
		 * @public
		 */
		formatWidthPalletNbr: function(sId) {
			var sWidth = "10em",
				sPalletId = this.formatter.removeLeadingZeros(sId);
			if (sPalletId.length > 17) {
				sWidth = "12em";
			}
			return sWidth;
		},

		/**
		 * Set the "level" property of the Pallet ID field based on it's length.
		 * @param {string} sId is the pallet being to considered.
		 * @returns {string} Text "level" property (H2 or H5).
		 * @public
		 */
		formatLevelPalletNbr: function(sId) {
			var sLevel = "H2",
				sPalletId = this.formatter.removeLeadingZeros(sId);
			if (sPalletId.length > 17) {
				sLevel = "H5";
			}
			return sLevel;
		},



		/* =========================================================== */
		/* begin: private methods                                      */
		/* =========================================================== */

		/**
		 * Set the busy overlay for the view.
		 * @param {boolean} bIsBusy set to true to set or false to remove the overlay.
		 * @param {boolean bWithDelay set to true to delay the overlay. 
		 * @public
		 */
		_setBusy : function (bIsBusy, bWithDelay) {
			var oModel = this._oComponent.getModel("waybillView");
			if (bIsBusy) {
				if (bWithDelay) {
					oModel.setProperty("/settings/delay", 0);
				}
				oModel.setProperty("/settings/busy", true);
			} else {
				var iDelay = oModel.getProperty("/settings/originalDelay");
				oModel.setProperty("/settings/busy", false);
				oModel.setProperty("/settings/delay", iDelay);
			}
		},

		/**
		 * This method is called each the router navigates to the view
		 * @param {sap.ui.base.Event} oEvent returned by the router.
		 * @private
		 */
		_onRoutePatternMatched: function(oEvent) {
			var bIsNew = this._oHistory.getDirection() === "NewEntry",
				sRouteName = oEvent.getParameter("name");
			if (sRouteName === "waybill") {
				// Assign the Pallet/PO search to the Scan event.
				this._oComponent.setScanId("WAYBILL");
				if (!bIsNew) {
					return;
				}
			} else {
				return;
			}

			var sBatchGroupId = "waybill",
				mNavArgs = oEvent.getParameter("arguments"),
				oWaybillViewModel = this._oComponent.getModel("waybillView");

			/* LOCAL FUNCTION */
			// Go get the Pallets/POs on a separate thread depending on the type of shipment.
			// We do this because we don't want to hold up the "primary" object's resopnse
			// by including it all in the same $batch call.
			var that = this,
				_fnLoadWayBillObjects = function(oWaybill) {
				if (oWaybill.Seal === "X") {
					/*  GIVE PALLETS PREFERENCE  */
					// Load the Waybill's POs on a separate thread.
					jQuery.sap.delayedCall(500, that, that._loadPOsForWaybill, [{
						store: oWaybill.StoreID,
						waybill: oWaybill.WayBillNbr,
						group: sBatchGroupId
					}]);

					// Load the Waybill's Pallets now.
					that._loadPalletsForWaybill({
						store: oWaybill.StoreID,
						waybill: oWaybill.WayBillNbr,
						group: sBatchGroupId
					});
				} else {
					/*  GIVE POS PREFERENCE  */
					// Load the Waybill's Pallets on a separate thread.
					jQuery.sap.delayedCall(500, that, that._loadPalletsForWaybill,[{
						store: oWaybill.StoreID,
						waybill: oWaybill.WayBillNbr,
						group: sBatchGroupId
					}]);

					// Load the Waybill's POs now.
					that._loadPOsForWaybill({
						store: oWaybill.StoreID,
						waybill: oWaybill.WayBillNbr,
						group: sBatchGroupId
					});
				}
			};

			// Only load the Waybill from the OData service if we don't already have it.
			var oWaybill = oWaybillViewModel.getProperty("/data/Waybill");
			if (jQuery.isEmptyObject(oWaybill)) {
				// check the service model first - the Lookup view should have loaded
				// our waybill before navigating here.
				var sPath = this._oServiceModel.createKey("/BOLSet", {
					StoreID: mNavArgs.store,
					WayBillNbr: mNavArgs.waybill
				});
				oWaybill = this._oServiceModel.getProperty(sPath);
				if (oWaybill) {
					oWaybillViewModel.setProperty("/data/Waybill", oWaybill);

					// Load the Waybill's Exceptions (issues) on a separate thread.
					jQuery.sap.delayedCall(500, this, this._loadExceptionsForWaybill, [{
						store: mNavArgs.store,
						waybill: mNavArgs.waybill,
						group: sBatchGroupId
					}]);

					// Load the rest of the Waybill data.
					_fnLoadWayBillObjects(oWaybill);
				} else {
					// Load the Waybill.
					this._loadWaybill({
						store: mNavArgs.store,
						waybill: mNavArgs.waybill,
						group: sBatchGroupId,
						success: function(oLoadedWaybill) {
							// Load the rest of the Waybill data.
							_fnLoadWayBillObjects(oLoadedWaybill);
						}
					});
					// Load the Exceptions (issues) for teh Waybill.
					this._loadExceptionsForWaybill({
						store: mNavArgs.store,
						waybill: mNavArgs.waybill,
						group: sBatchGroupId
					});
				}
			}
		},

		/**
		 * Load the Waybill from the OData service.
		 * @Param {map} mParameters Parameters of the request.
		 * @private
		 */
		_loadWaybill : function(mParameters) {
			var oModel = this._oComponent.getModel("waybillView"),
				sPath = this._oServiceModel.createKey("/BOLSet", {
					StoreID: mParameters.store,
					WayBillNbr: mParameters.waybill
				});

			oModel.setProperty("/data/Waybill", {});

			var fnSucess = mParameters.hasOwnProperty("success") ? mParameters.success : null,
				fnError = mParameters.hasOwnProperty("error") ? mParameters.error : null;
			this._oServiceModel.read(sPath, {
				groupId: mParameters.group,
				success: function(oWaybillData) {
					oModel.setProperty("/data/Waybill", oWaybillData);
					if (fnSucess) {
						fnSucess(oWaybillData);
					}
				},
				error: function(oError) {
					jQuery.sap.log.error(
						"OData Error", 
						["Failed to load entity " + sPath], 
						["Waybill.Controller.js"]
					);
					if (fnError) {
						fnError(oError);
					}
				}
			});
		},

		/**
		 * Load the Waybill from the OData service.
		 * @Param {map} mParameters Parameters of the request.
		 * @private
		 */
		_loadExceptionsForWaybill : function(mParameters) {
			var oModel = this._oComponent.getModel("waybillView"),
				sPath = this._oServiceModel.createKey("/BOLSet", {
					StoreID: mParameters.store,
					WayBillNbr: mParameters.waybill
				}) + "/Exceptions";

			oModel.setProperty("/data/Issues", []);
			oModel.setProperty("/data/IssueCount", 0);

			this._oServiceModel.read(sPath, {
				groupId: mParameters.group,
				success: function(oIssueData) {
					oModel.setProperty("/data/Issues", oIssueData.results);
					oModel.setProperty("/data/IssueCount", oIssueData.results.length);
				},
				error: function() {
					jQuery.sap.log.error(
						"OData Error", 
						["Failed to load entity " + sPath], 
						["Waybill.Controller.js"]
					);
				}
			});
		},

		/**
		 * Load all of the Pallets from the OData service for a given Waybill.
		 * @Param {map} mParameters Parameters of the request.
		 * @private
		 */
		_loadPalletsForWaybill : function (mParameters) {
			var oModel = this._oComponent.getModel("waybillView"),
				sPath = this._oServiceModel.createKey("/BOLSet",{
					StoreID: mParameters.store,
					WayBillNbr: mParameters.waybill
				}) + "/Pallets";

			oModel.setProperty("/data/PalletRGRCount", "0");
			oModel.setProperty("/data/PalletDGRCount", "0");
			oModel.setProperty("/data/PalletReceivedCount", "0");
			oModel.setProperty("/data/AllPallets", []);
			oModel.setProperty("/data/RGRPallets", []);
			oModel.setProperty("/data/DGRPallets", []);
			oModel.setProperty("/data/ReceivedPallets", []);

			var fnSucess = mParameters.hasOwnProperty("success") ? mParameters.success : null,
				fnError = mParameters.hasOwnProperty("error") ? mParameters.error : null;

			this._oServiceModel.read(sPath, {
				groupId: mParameters.group,
				success: function(oPalletData) {
					// Update the "All Plallets" model
					oModel.setProperty("/data/AllPallets", oPalletData.results);

					// Update the "RGR" model.
					var aRGRPallets = oPalletData.results.filter(function(oPallet) {
						return (oPallet.PalletStatus === "N");	// Needs DGR
					});
					oModel.setProperty("/data/RGRPallets", aRGRPallets);

					// Update the "RGR Pallet" count.
					oModel.setProperty("/data/PalletRGRCount", aRGRPallets.length.toString());

					// Update the "Needs DGR" model
					var aDGRPallets = oPalletData.results.filter(function(oPallet) {
						return (oPallet.PalletStatus === "R");	// Needs DGR
					});
					oModel.setProperty("/data/DGRPallets", aDGRPallets);

					// Update the "DGR Pallet" count.
					oModel.setProperty("/data/PalletDGRCount", aDGRPallets.length.toString());

					// Update the "Completely Received" model
					var aReceivedPallets = oPalletData.results.filter(function(oPallet) {
						return (oPallet.PalletStatus === "X");	// Completely Received
					});
					oModel.setProperty("/data/ReceivedPallets", aReceivedPallets);

					// Update the "Complete Pallet" count.
					oModel.setProperty("/data/PalletReceivedCount", aReceivedPallets.length.toString());

					if (fnSucess) {
						fnSucess(oPalletData.results);
					}
				},
				error: function(oError) {
					jQuery.sap.log.error(
						"OData Error", 
						["Failed to load entity " + sPath], 
						["Waybill.Controller.js"]
					);
					if (fnError) {
						fnError(oError);
					}
				}
			});
		},

		/**
		 * Load all of the POs from the OData service for a given Waybill.
		 * @Param {map} mParameters Parameters of the request.
		 * @private
		 */
		_loadPOsForWaybill : function (mParameters) {
			var oModel = this._oComponent.getModel("waybillView"),
				sPath = this._oServiceModel.createKey("/BOLSet",{
					StoreID: mParameters.store,
					WayBillNbr: mParameters.waybill
				}) + "/POHeaders";

			oModel.setProperty("/data/PORGRCount", "0");
			oModel.setProperty("/data/PODGRCount", "0");
			oModel.setProperty("/data/POReceivedCount", "0");
			oModel.setProperty("/data/AllPOs", []);
			oModel.setProperty("/data/RGRPOs", []);
			oModel.setProperty("/data/DGRPOs" ,[]);
			oModel.setProperty("/data/ReceivedPOs", []);

			var fnSucess = mParameters.hasOwnProperty("success") ? mParameters.success : null,
				fnError = mParameters.hasOwnProperty("error") ? mParameters.error : null;

			this._oServiceModel.read(sPath, {
				groupId: mParameters.group,
				success: function(oPOData) {
					// Update the "All POs" model
					oModel.setProperty("/data/AllPOs", oPOData.results);

					// Update the "RGR" model.
					var aRGRPOs = oPOData.results.filter(function(oPO) {
						return (oPO.POStatus === "N");	// Needs DGR
					});
					oModel.setProperty("/data/RGRPOs", aRGRPOs);

					// Update the "RGR PO" count.
					oModel.setProperty("/data/PORGRCount", aRGRPOs.length.toString());

					// Update the "Needs DGR" model
					var aDGRPOs = oPOData.results.filter(function(oPO) {
						return (oPO.POStatus === "R");	// Needs DGR
					});
					oModel.setProperty("/data/DGRPOs", aDGRPOs);

					// Update the "DGR PO" count.
					oModel.setProperty("/data/PODGRCount", aDGRPOs.length.toString());

					// Update the "Completely Received" model.
					var aReceivedPOs = oPOData.results.filter(function(oPO) {
						return (oPO.POStatus === "X");	// Completely Received
					});
					oModel.setProperty("/data/ReceivedPOs", aReceivedPOs);

					// Update the "Complete PO" count.
					oModel.setProperty("/data/POReceivedCount", aReceivedPOs.length.toString());

					if (fnSucess) {
						fnSucess(oPOData.results);
					}
				},
				error: function(oError) {
					jQuery.sap.log.error(
						"OData Error", 
						["Failed to load entity " + sPath], 
						["Waybill.Controller.js"]
					);
					if (fnError) {
						fnError(oError);
					}
				}
			});
		},


		/**
		 * Calculate and set scroller height to take up the remainder of the
		 * view below the toolbar.
		 * @private
		 */
		_setListScrollerHeight : function() {
			var oTabBar = null,
				sToolbarId = "idWaybillPage",
				sScrollerId = "idWaybillPage",
				sSelectedTab = "",
				oTabBarPallet = this._oView.byId("idWaybillPageTabBarPallet");

			if (oTabBarPallet.getVisible()) {
				oTabBar = oTabBarPallet;
				sSelectedTab = oTabBar.getSelectedKey();
				sToolbarId = sToolbarId + "Pallet" + sSelectedTab + "Toolbar";
				sScrollerId = sScrollerId + "Pallet" + sSelectedTab + "Scroller";
			} else {
				oTabBar = this._oView.byId("idWaybillPageTabBarPO");
				sSelectedTab = oTabBar.getSelectedKey();
				sToolbarId = sToolbarId + "PO" + sSelectedTab + "Toolbar";
				sScrollerId = sScrollerId + "PO" + sSelectedTab + "Scroller";
			}

			var oScroller = this._oView.byId(sScrollerId);
			if (!oScroller) {
				return;
			}

			var oPage = this._oView.byId("idWaybillPage"),
				oToolbar = this._oView.byId(sToolbarId),
				iPageHeight = oPage.$().outerHeight(true),
				iToolbarHeight = oToolbar ? oToolbar.$().outerHeight(true) : 0,
				iToolbarFromtop = oToolbar ? oToolbar.$().offset().top : 0,
				iHeight = iPageHeight - iToolbarFromtop - iToolbarHeight - 2;
			
			oScroller.setHeight(iHeight.toString() + "px" );
		},

		/**
		 * Find a Pallet/PO from the given string and navigate to the Pallet/PO view if it needs DGR.
		 * @param {string} sQuery string to lookup.
		 * @private
		 */
		_performSearch : function (sQuery) {
			var oModel = this._oComponent.getModel("waybillView"),
				oWaybill = oModel.getProperty("/data/Waybill");
			if (oWaybill.Seal === "X") {
				var aPallets = oModel.getProperty("/data/AllPallets").filter(function(oPallet) {
						return oPallet.PalletID === sQuery;
					});
				if (aPallets.length > 0) {
					var oPallet = aPallets[0];
					if (oPallet.PalletStatus === "N") {
						// Open the Pallet Detail Dialog.
						if (!this._oPalletDialog) {
							// Bind the Pallet Detail Dialog.
							this.initPalletDialog();
						}
						this._oPalletDialog.getModel().setData(oPallet);
						this._oPalletDialog.open();
					} else {
						// Navigate to the Pallet view.
						this._oComponent.getRouter().navTo("pallet", {
							from: "waybill",
							store: oPallet.StoreID,
							waybill: oPallet.WayBillNbr,
							pallet: oPallet.PalletID,
							tab: null
						});
					}
				}
			} else {
				var aPOs = oModel.getProperty("/data/AllPOs").filter(function(oPO) {
						return oPO.PONbr === sQuery;
					});
				if (aPOs.length > 0) {
					var oPO = aPOs[0];
					if (oPO.POStatus === "R") {
						// Navigate to the Pallet view.
						this._oComponent.getRouter().navTo("puchaseOrder", {
							from: "waybill",
							store: oPO.StoreID,
							waybill: oPO.WayBillNbr,
							po: oPO.PONbr,
							tab: null
						});
					} else {
						// Open the PO Detail Dialog.
						if (!this._oPODialog) {
							// Bind the PO Detail Dialog.
							this.initPODialog();
						}
						this._oPODialog.getModel().setData(aPOs[0]);
						this._oPODialog.open();
					}
				}
			}
		}
	});
});