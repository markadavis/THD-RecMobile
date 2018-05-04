sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"thd/recmobile/component/extendedSearch/ExtendedSearch",
	"thd/recmstr/module/driverCheckIn/DriverCheckIn",
	"thd/recmobile/util/utilities"
], function(Controller, JSONModel, ExtendedSearch, DriverCheckIn, utilities) {
	"use strict";
	return Controller.extend("thd.recmobile.controller.Lookup", {
		utilities : utilities,

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
			this._oHistory = sap.ui.core.routing.History.getInstance();
			this.utilities.bindComponent(this);
			var iOriginalDelay = this.getView().getBusyIndicatorDelay(),
				oViewData = {
					settings: {
						busy : false,
						delay : iOriginalDelay,
						originalDelay: iOriginalDelay
					},
					data: {
						searchTerm: ""
					}
				},
				oViewModel = new JSONModel(oViewData);

			// Set the Lookup view's model.
			this._oComponent.setModel(oViewModel, "lookupView");

			// Bind the Extended Search component.
			this._extendedSearch = new ExtendedSearch({
				controller: this,
				storeId: this._oComponent.getModel("appView").getProperty("/data/location/StoreID"),
				model: this._oComponent.getModel(),
				fireSearchOnOpen: true	// true = execute the search on open
			});

			// Subscribe the view to the Scan event.
			this._oComponent.bindScanListener({
				id: "LOOKUP",
				onScan: function(sBarCode) {
					this._performSearch(sBarCode);
				}.bind(this)
			});

			// Bind the Driver Check-In component.
			var oPromise = new DriverCheckIn(this).then(function(oDriverCheckIn) {
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
			if (this._extendedSearch) {
				this._extendedSearch.destroy();
			}
			if (this._driverCheckIn) {
				this._driverCheckIn.destroy();
			}
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
		 * Handle the "Search" form button press event.
		 * @param {sap.ui.base.Event} oEvent Search button press event object.
		 * @public
		 */
		onSearchButtonPress : function (oEvent) {
			if (!oEvent.getParameters().clearButtonPressed) {
				var sQuery = oEvent.getParameter("query");
				if (sQuery) {
					this._performSearch(sQuery.toUpperCase());
				}
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



		/* =========================================================== */
		/* Begin: helper methods                                       */
		/* =========================================================== */

		/**
		 * Set the busy overlay for the view.
		 * @param {boolean} bIsBusy set to true to set or false to remove the overlay.
		 * @param {boolean bWithDelay set to true to delay the overlay. 
		 * @public
		 */
		_setBusy : function (bIsBusy, bWithDelay) {
			var oModel = this._oComponent.getModel("lookupView");
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



		/* =========================================================== */
		/* begin: private methods                                      */
		/* =========================================================== */

		/**
		 * This method is called each the router navigates to the view
		 * @param {sap.ui.base.Event} oEvent returned by the router.
		 * @private
		 */
		_onRoutePatternMatched: function(oEvent) {
			var bIsNew = this._oHistory.getDirection() === "NewEntry",
				sRouteName = oEvent.getParameter("name");
			if (sRouteName === "lookup") {

				// Assign the BOL search to the Scan event.
				this._oComponent.setScanId("LOOKUP");

				// Clear the OData and view model data on backward navigation (starting over).
				if (!bIsNew) {
					this._oServiceModel.resetChanges();
					this._oServiceModel.refresh(false, true);
					var oLookupModel = this._oComponent.getModel("lookupView");
					if (oLookupModel) {
						oLookupModel.setProperty("/data/searchTerm", "");
					}
					var oWaybillModel = this._oComponent.getModel("waybillView");
					if (oWaybillModel) {
						oWaybillModel.setProperty("/data", {
							Waybill: {},
							IssueCount: 0,
							OpenPallets: 0,
							OpenPOs: 0,
							AllPallets: [],
							DGRPallets: [],
							RGRPallets: [],
							AllPOs: [],
							DGRPOs: [],
							RGRPOs: []
						});
					}
					var oPalletModel = this._oComponent.getModel("palletView");
					if (oPalletModel) {
						oPalletModel.setProperty("/data", {
							Pallet: {},
							IssueCount: 0,
							AllArticles: [],
							DGRArticles: [],
							CompleteArticles: []
						});
					}
				}
			}
		},

		/**
		 * Find a BOL from the given string and navigate (if found).
		 * @param {string} sQuery string to lookup.
		 * @private
		 */
		_performSearch : function (sQuery) {
			this._setBusy(true);
			var sStoreId = this._oComponent.getModel("appView").getProperty("/data/location/StoreID"),
				sPath = this._oServiceModel.createKey("/BOLSet", {
					StoreID: sStoreId,
					WayBillNbr: sQuery
				});
			this._oServiceModel.read(sPath, {
				success: function(oData) {
					this._setBusy(false);
					if (oData && oData.hasOwnProperty("EntryStatus") && oData.EntryStatus === "I" ) {
						this._driverCheckIn.openDialog(
							oData, 
							this._oComponent.getEditable(), 
							function(sAction, oCheckInData) {
								if (sAction === "save") {
									// Remove the waybill from the OData model to force it to re-load.
									// this._oServiceModel.deleteCreatedEntry(this._oServiceModel.getContext(sPath));
									// Update the OData model.
									var oWaybill = this._oServiceModel.getProperty(sPath);
									oWaybill.EntryStatus = "P";	// Pending
									oWaybill.ArrivedTimeStamp = oCheckInData.ArrivalTimeStamp;
									oWaybill.SealDecertify = oCheckInData.SealDecertify;
									oWaybill.SealIntact = oCheckInData.SealIntact;
									oWaybill.SealMatch = oCheckInData.SealNbrSite === oCheckInData.SealNbrWms ? "X" : "";
									oWaybill.ActionCode = "03";	// Pending RGR.
									this._oServiceModel.setProperty(sPath, oWaybill);
									this._oServiceModel.resetChanges([sPath]);
									// Show the user the RGR Reference Nubmer (if given).
									if (oCheckInData && oCheckInData.RefNumber) {
										this.utilities.showMessageBox(
											"INFORMATION",						//icon
											"LookupPageCheckIn_ReferenceNumber",	//i18n text ID
											[oCheckInData.RefNumber],
											function() {
												this.router.navTo("waybill", {
													from: "lookup",
													store: this.storeId,
													waybill: this.waybill,
													tab: null
												});
											}.bind({
												router: this._oComponent.getRouter(),
												storeId: sStoreId,
												waybill: sQuery
											})
										);
									} else {
										this._oComponent.getRouter().navTo("waybill", {
											from: "lookup",
											store: sStoreId,
											waybill: sQuery,
											tab: null
										});
									}
								}
							}.bind(this)
						);
					} else if (oData && oData.hasOwnProperty("EntryStatus")) {
						this._oComponent.getRouter().navTo("waybill", {
							from: "lookup",
							store: sStoreId,
							waybill: sQuery,
							tab: null
						});
					}
				}.bind(this),
				error: function(oErr) {
					this._setBusy(false);
					this._extendedSearch.openDialog(sQuery);
				}.bind(this)
			});
		}
	});
});