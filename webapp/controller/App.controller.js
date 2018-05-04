sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
], function(Controller, JSONModel) {
	"use strict";
	return Controller.extend("thd.recmobile.controller.App", {

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf thd.recmobile.view.view.view.App
		 */
		onInit: function() {
			var oController = this,
				oComponent = this.getOwnerComponent(),
				oServiceModel = oComponent.getModel(),
				oView = this.getView();

			// Bind to the barcode scan event
			var bHasCamScanner = oComponent._registerForBarcode();

			// Create the App view's model.
			var iOriginalDelay = oView.getBusyIndicatorDelay(),
				oViewData = {
					settings: {
						busy: false,
						delay: 0,
						originalDelay: iOriginalDelay,
						hasCameraScanner: bHasCamScanner
					},
					data: {
						location: {}
					}
				},
				oViewModel = new JSONModel(oViewData);
			oComponent.setModel(oViewModel, "appView");

			// Load up the static Entities once the model's metadata is loaded.
			this._setBusy(true);
			oServiceModel.metadataLoaded().then(function() {

				// Get the User's location (Store ID) - THEN initialize the router.
				oServiceModel.read("/LocationSet('')", {
					success: function(oData) {
						// Set location info on the App View's model
						var oModel = oComponent.getModel("appView");
						oModel.setProperty("/data/location", oData);
						oController._setBusy(false);
					},
					error: function() {
						oController._setBusy(false);
					}
				});

				// Load the Exception Types (static content).
				oServiceModel.read("/ExceptionTypeSet", {
					success: function(oData) {
						var aExceptionTypes = oData.results;
						aExceptionTypes.splice(0, 0, {
							TypeCode: "",
							TypeText: " "
						});
						var oExceptionModel = new JSONModel(oData.results);
						oComponent.setModel(oExceptionModel, "exceptionTypeSet");
					}
				});
				oViewModel.setProperty("/settings/busy", false);
				oViewModel.setProperty("/settings/delay", oViewData.originalDelay);
			});

			// Apply the content density mode to the root view.
			oView.addStyleClass(oComponent.getContentDensityClass());
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf thd.recmobile.view.view.view.App
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf thd.recmobile.view.view.view.App
		 */
		//	onAfterRendering: function() {
		//
		// },

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf thd.recmobile.view.view.view.App
		 */
		//	onExit: function() {
		//
		// },

		/**
		 * Set the busy overlay for the view.
		 * @param {boolean} bIsBusy set to true to set or false to remove the overlay.
		 * @param {boolean bWithDelay set to true to delay the overlay. 
		 * @public
		 */
		_setBusy: function(bIsBusy, bWithDelay) {
			var oModel = this.getOwnerComponent().getModel("appView");
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
		}
	});
});