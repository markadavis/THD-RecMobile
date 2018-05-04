sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/resource/ResourceModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"thd/recmobile/util/formatter"
], function(BaseObject, Device, JSONModel, ResourceModel, Filter, FilterOperator, GroupHeaderListItem, formatter) {
	"use strict";
	return BaseObject.extend("thd.recmobile.component.extendedSearch.ExtendedSearch", {

		formatter: formatter,

		/**
		 * Provides a convenience API for Exended Serch Dialog. All the functions will
		 * wait until the initial load of the a Dialog passed to the instance by the
		 * bindDialog function.
		 * @param {sap.ui.core.mvc.Controller} oController is the owner of the component.
		 * @param {boolean} bFireSearchOnOpen automate the "search" (button press) when first bound.
		 * @class
		 * @public
		 * @alias thd.recmobile.component.extendedSearch.ExtendedSearch
		 */
		constructor: function(oParams) {
			// Bind all of the private properties.
			this._bFireSearchOnOpen = oParams.fireSearchOnOpen || false;
			this._oController = oParams.controller;
			this._oComponent = this._oController.getOwnerComponent();
			this._oModel = oParams.hasOwnProperty("model") ? oParams.model : null;
			this._oView = this._oController.getView();
			this._sStoreId = oParams.storeId;
			this._sDialogIdPrefix = this._oController.getView().getId();
			this._sDialogId = "";

			// Create the Device model.
			this._oDeviceModel = new JSONModel(Device);
			this._oDeviceModel.setDefaultBindingMode("OneWay");

			// Create a resource bundle for language specific texts
			this._oResourceModel = new ResourceModel({
				bundleName : "thd.recmobile.component.extendedSearch.ExtendedSearch"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();
		},

		/**
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
		 * Convenience method for getting the language specific text resources.
		 * @param {string} sTextId is the I18N resource ID.
		 * @public
		 * @returns {string} the language specific text requested.
		 */
		getText : function (sTextId) {
			return this._oResourceBundle.getText(sTextId);
		},


		/**
		 * Bind the Extended Search dialog to the API.
		 * @returns {sap.m.Dialog} the Extended Search dialog.
		 * @public
		 */
		bindDialog : function () {
			if (!this._oDialog) {
				if (this._sDialogId && this._oView) {
					this._oDialog = this._oView.byId(this._sDialogId);
				}
				if (!this._oDialog) {
					// Construct and bind the Dialog.
					this._oDialog = sap.ui.xmlfragment(
						this._sDialogIdPrefix,
						"thd.recmobile.component.extendedSearch.ExtendedSearch",
						this
					);
					this._sDialogId = this._oDialog.getId();
				}

				// Bind the list.
				this._oList = this._oView.byId("idExtendedSearch_List");

				// Bind the models
				this._oDialog.setModel(this._oResourceModel, "i18n");
				this._oDialog.setModel(this._oDeviceModel, "device");
				// Create the Search Results model.
				var oResutlsModel = new JSONModel({});
				this._oDialog.setModel(oResutlsModel, "searchResults");
			}

			return this._oDialog;
		},

		/**
		 * Has the Extended Search dialog been bound?
		 * @returns {boolean}  True if the Extended Search dialog is bound.
		 * @public
		 */
		 isBound : function () {
		 	return this._oDialog ? true : false;
		 },

		/**
		 * Open the Dialog for user interaction.
		 * @param {string} sSearchTerm is the initial search term.
		 * @public
		 */
		 openDialog : function (sSearchTerm) {
			if (!this.isBound()) {
				this.bindDialog();
			}
			this._oList.setVisible(false);
			if (!this._oDialog.isOpen()) {

				// Remove the BOL search field for scanner input.
				this._sScanId = this._oComponent.getScanId();
				this._oComponent.setScanId("");

				// Open the dialog
				this._oDialog.open();

				// Set the initial search term.
				if (sSearchTerm) {
					var oSerTerm = this._oView.byId("idExtendedSearch_SearchTerm");
					oSerTerm.setValue(sSearchTerm);
				}

				// Set the initial From & To dates.
				var oFromDate = this._oView.byId("idExtendedSearch_BegDate"),
					oToDate = this._oView.byId("idExtendedSearch_EndDate"),
					dToday = new Date(),
					dBegin = new Date(),
					dEnd = new Date();
				dBegin.setDate(dToday.getDate() - 3);
				dEnd.setDate(dToday.getDate() + 3);
				oFromDate.setDateValue(dBegin);
				oToDate.setDateValue(dEnd);

				// Expand the "dates" panel.
				this._oView.byId("idExtendedSearch_DatePanel").setExpanded(true);

			}
		 },

		/**
		 * Close the dialog and clear the search term.
		 * @public
		 */
		 closeDialog : function () {
			// Reassign the BOL search field for scanner input.
			this._oComponent.setScanId(this._sScanId);
			this._sScanId = "";

			// Close the dialog.
			this._oDialog.close();
			this._oView.byId("idExtendedSearch_SearchTerm").setValue();
		 },



		/* =========================================================== */
		/* Begin: View Formatter methods                               */
		/* =========================================================== */

		/**
		 * Builds the sorted list group header to the search list.
		 * @param {object} oGroup contains the group key.
		 * @returns {sap.m.GroupHeaderListItem} The list item grouping object.
		 * @public
		 */
		 formatPalletGroupHeader : function (oGroup) {
			var sTitle = "";
			switch (oGroup.key) {
				case "??":
					sTitle = this.getText("ExtendedSearch_groupWaybill");
					break;
				case "???":
					sTitle = this.getText("ExtendedSearch_groupPO");
					break;
				case "????":
					sTitle = this.getText("ExtendedSearch_groupArticle");
					break;
		 	}
			return new GroupHeaderListItem({
				id: "idExtendedSearch_listGroup_" + oGroup.key,
				title: sTitle,
				upperCase: false
			});
		},

		/**
		 * Return the search "intro" list property as either "expetec" or "arrival" date.
		 * @param {Date} dArrivalDate is the shipment actual arrival date.
		 * @param {Date} dScheduleDate is the shipment scheduled arrival date.
		 * @returns {string} text value for the "intro" property
		 * @public
		 */
		 getIntro : function (dArrivalDate, dScheduleDate) {
			var sText = "";
			// Need to bind the Resource Bundle to the formatter object because
			// it is not being called form the rendering engine (xml).
			if (!this.formatter.oBundle) {
				this.formatter.oBundle = this.getResourceBundle();
			}
			if (dArrivalDate) {
				sText = this.getText("ExtendedSearch_InboundArrived")
					+ " " + formatter.timeDateValue(dArrivalDate);
			} else if (dScheduleDate) {
				sText =  this.getText("ExtendedSearch_InboundScheduled")
					+ " " + formatter.timeDateValue(dScheduleDate);
			}
			return sText;
		 },

		/**
		 * Return the search "number" list property.
		 * @param {string} sWayBillNbr for the list item.
		 * @param {string} sPONbr for the list item.
		 * @param {string} sMatnr ID for the list item'.
		 * @returns {string} text value for the "number" property
		 * @public
		 */
		 getNumber : function (sWayBillNbr, sPONbr, sMatnr) {
			var sText = "";
			if (sMatnr) {
				sText = this.getText("ExtendedSearch_Article");
			} else if (sPONbr) {
				sText = this.getText("ExtendedSearch_PO");
			} else if (sWayBillNbr) {
				sText = this.getText("ExtendedSearch_BOL");
			}
			return sText;
		 },

		/**
		 * Return the search "icon" list property.
		 * @param {string} sWayBillNbr for the list item.
		 * @param {string} sPONbr for the list item.
		 * @param {string} sMatnr ID for the list item'.
		 * @returns {string} text value for the "icon" property
		 * @public
		 */
		 geIcon : function (sWayBillNbr, sPONbr, sMatnr) {
			var sText = "";
			if (sMatnr) {
				sText = "sap-icon://product";
			} else if (sPONbr) {
				sText = "sap-icon://sales-document";
			} else if (sWayBillNbr) {
				sText = "sap-icon://shipping-status";
			}
			return sText;
		 },

		/**
		 * Custom search list grouping function.
		 * @param {map} mItem has the list item information.
		 * @returns {map} the model sorter map {key:sGroupID,text:sLabel}.
		 * @public
		 */
		 onListGroup : function (mItem) {
			return {"A": "First Group"};
		 },
		 /**
		  * Custom comparator function used for clientside sorting of the search list.
		  * @param {string} i1 first item to compare.
		  * @param {string} i2 second item to compare
		  * @return {integer} -1, 0 or 1, depending on the order of the two items
		  * @public
		  */
		 onListCompare : function (i1, i2) {
			return 1;
		 },



		/* =========================================================== */
		/* Begin: Event handler methods                                */
		/* =========================================================== */

		/**
		 * This method is called when the dialog "open()" method is called.
		 * @param {sap.ui.base.Event} oEvent "afterOpen" event object.
		 * @public
		 */
		onDialogAfterOpen : function (oEvent) {
			if (this._bFireSearchOnOpen) {
				this._oView.byId("idExtendedSearch_searchBtn").firePress();
			} else {
				this._oView.byId("idExtendedSearch_DatePanel").setExpanded(true);
			}
		},

		/**
		 * This method is bound to the result list's "updateFinished" event.
		 * @param {sap.ui.base.Event} oEvent updateFinished event object.
		 * @public
		 */
		onListUpdateFinished : function (oEvent) {
			
		},

		/**
		 * Called when the "Press" event is fired on the "scroll to unscanned" button.
		 * @param {sap.ui.base.Event} oEvent "scroll to unscanned" button press event object.
		 * @public
		 */
		onGoToGroup : function (oEvent) {
			var sGroupKey = "???",
				oItem = this._oView.byId("idExtendedSearch_listGroup_" + sGroupKey);	//Not scanned (not RGR'd)
			if (oItem) {
				this._oView.byId("idExtendedSearch_Scroller").scrollToElement(oItem, 500);
			}
		},

		/**
		 * Search button event handler - call the back-end service to get the results.
		 * @public
		 */
		 onExtendedSearchPressSearch : function () {
			var aFilters = [];

			this._oDialog.getModel("searchResults").setData({});

			this._oDialog.setBusy(true);
			this._oList.removeSelections();
			this._oList.setVisible(false);

			aFilters.push(new Filter(
				"StoreID",
				FilterOperator.EQ,
				this._sStoreId
			));
			aFilters.push(new Filter(
				"WayBillNbr",
				FilterOperator.EQ,
				this._oView.byId("idExtendedSearch_SearchTerm").getValue()
			));
			aFilters.push(new Filter(
				"ScheduledTimeStamp", FilterOperator.BT,
				this._oView.byId("idExtendedSearch_BegDate").getDateValue().toISOString(),
				this._oView.byId("idExtendedSearch_EndDate").getDateValue().toISOString()
			));

			this._oModel.read("/BOLSearchSet", {
				filters: aFilters,
				success: function(oData) {
					this._oDialog.getModel("searchResults").setData(oData);
					// if (oData.length > 0) {
						this._oView.byId("idExtendedSearch_DatePanel").setExpanded(false);
					// }
					this._oDialog.setBusy(false);
				}.bind(this),
				error: function(oErr) {
					this._oView.byId("idExtendedSearch_DatePanel").setExpanded(false);
					this._oList.setVisible(true);
					this._oDialog.setBusy(false);
				}.bind(this)
			});
		 },

		 /**
		  * Cancel search button event handler - close the extended search dialog.
		  * @public
		  */
		onExtendedSearchPressCancel : function () {
			this.closeDialog();
		},

		/**
		 * Search results list item press event handler.
		 * @param {sap.ui.base.Event} oEvent the list item selection event object.
		 * @public
		 */
		onPress: function (oEvent) {
			// Get the list item, either from the listItem parameter or from the event's source itself
			// (will depend on the device-dependent mode).
			var bReplace = !Device.system.phone,
				oItem = oEvent.getParameter("listItem") || oEvent.getSource(),
				sPath = oItem.getBindingContextPath(),
				oItemData = this._oModel.getObject(sPath);

			if (oItemData.EntryStatus === "I") {	// Inbound Waybill
				// Unselect the list item before moving off.
				this._oList.removeSelections();

				// Open the Driver Check-in dialog.
				if (!this._oController.driverCheckIn.isBound()) {
					this._oController.driverCheckIn.bindDialog();
				}
				this._oController.driverCheckIn.openDialog(oItemData.StoreID, oItemData.WayBillNbr);

				// Close the dialog.
				this._oDialog.close();

			} else if (oItemData.EntryStatus === "R") {	// Closed PO
				// If the object is a Closed PO, we need to ask if they want to re-open it.
				this._oController.showMessageDialogYesNo({
					sMessageKey : "MessageDialogQuestion_RepoenPO",
					fnCallBackYes : function() {
						// Reopen the PO before navigating to the shipment details.
						this._oModel.update(sPath, oItemData, {
							success: function(oData, oResponse) {
								// Remove the busy overlay.
								this._oList.setBusy(false);
								this._oList.setSelectedItem(this._oList.getSelectedItem(), false);
								this._oList.setBusyIndicatorDelay(this._iBusyDelay);
							}.bind(this),
							error: function() {
								// Remove the busy overlay.
								this._oList.setBusy(false);
								this._oList.setBusyIndicatorDelay(this._iBusyDelay);
							}.bind(this)
						});
					}.bind(this),
					fnCallBackNo : function() {}
				});

			} else {
				// Navigate to the detail view;
				this._oController.getRouter().navTo("object", {
					StoreID: oItemData.StoreID,
					WayBillNbr: oItemData.WayBillNbr
				}, bReplace);

				// Close the dialog.
				this._oDialog.close();
			}
		},

		/**
		 * Event handler for the search criteria panel expand/collapse activity.
		 * @param {sap.ui.base.Event} oEvent panel "expand" event object.
		 * @public
		 */
		onPanelExpand : function (oEvent) {
			var oPanel = oEvent.getSource(),
				sText = "";

			// Set put the filter value into the panel header when closed.
			if (oEvent.getParameter("expand")) {
				sText = this.getText("ExtendedSearch_PanelTitle");
			} else {
				sText = this.getText("ExtendedSearch_PanelTitleFind")
						+ this._oView.byId("idExtendedSearch_SearchTerm").getValue();
			}
			oPanel.setHeaderText(sText);

			// Set the list "scroller" area's height to fill the rest of the dialog widow.
			jQuery.sap.delayedCall(500, this, function () {
				this._setListScrollerHeight();
			});
		},

		/**
		 * Modify the list filters (Waybill / PO / Article).
		 * @param {sap.ui.base.Event} oEvent footer "filter" button press event object.
		 * @public
		 */
		 onExtendedSearchPressFilter : function (oEvent) {
			var that = this,
				sWaybillId = "idExtenededSearch_filterPopover_waybill",
				sPOId = "idExtenededSearch_filterPopover_PO",
				sArticleId = "idExtenededSearch_filterPopover_article",
				oFilterDialog = new sap.m.Popover("idExtenededSearch_filterPopover", {
				modal: true, 
				placement: sap.m.PlacementType.Top,
				title: "Filter Selections",
				content: [ new sap.ui.layout.form.SimpleForm({
					content: [
						new sap.m.VBox({
							justifyContent: sap.m.FlexJustifyContent.SpaceAround,
							items: [
								new sap.m.CheckBox(sWaybillId, {
									text: "Show Waybills",
									selected: true
								}),
								new sap.m.CheckBox(sPOId, {
									text: "Show POs",
									selected: true
								}),
								new sap.m.CheckBox(sArticleId, {
									text: "Show Articles",
									selected: true
								}) 
							]
						})
					]})
				],
				endButton: new sap.m.Button({
					icon: "sap-icon://accept",
					press: function() {
						that._setListFilters({
							waybill: this._oView.byId(sWaybillId).getSelected(),
							po: this._oView.byId(sPOId).getSelected(),
							article: this._oView.byId(sArticleId).getSelected()
						});
						oFilterDialog.close();
					}
				}),
				afterClose : function(oEvt) {
					oEvt.getSource().destroy();
				}
			}).openBy(oEvent.getSource());
		 },



		/* =========================================================== */
		/* Begin: Private methods                                      */
		/* =========================================================== */

		/**
		 * For the currently selected Icon Tab, calculate and set scroller height to
		 * take up the remainder of the view below the toolbar.
		 * @param {string} sTabKey the Detail view's list identifier.
		 * @private
		 */
		_setListScrollerHeight : function() {
			if (this._oDialog) {
				var oScroller = this._oView.byId("idExtendedSearch_Scroller"),
					oSearchTerm = this._oView.byId("idExtendedSearch_DatePanel"),
					iDialogHeight = this._oDialog.$().outerHeight(true),
					iSearchTermHeight = oSearchTerm.$().outerHeight(true),
					iSearchTermFromtop = oSearchTerm.$().offset().top,
					
					iHeaderHeight = this._oDialog.getAggregation("_header").$().outerHeight(true),
					
					iHeight = iDialogHeight - iSearchTermHeight - iSearchTermFromtop - iHeaderHeight;
				
				oScroller.setHeight(iHeight.toString() + "px" );
			}
		},

		/**
		 * Set the search results list's filters from the given map of filters.
		 * @param {map} mFilters the filters to be set.  Each property is given as a boolean:
		 *				{waybill: true/false, po: true/false, article: true/false}
		 * @private
		 */
		 _setListFilters : function (mFilter) {
			var aFilter = [],
				aDataFilter = [],
				oDataFilter;

			// If all of the additional filters are set, there is no need to filter anything.
			if (!(mFilter.waybill && mFilter.po && mFilter.article)) {

				// Set the Waybill filter.
				if (mFilter.waybill) {
					aFilter = [];
					aFilter.push(new Filter("WayBillNbr", FilterOperator.NE, ""));
					aFilter.push(new Filter("PONbr", FilterOperator.EQ, ""));
					aFilter.push(new Filter("ItemID", FilterOperator.EQ, ""));
					aDataFilter.push(new Filter(aFilter, true)); // -and-
				}

				// Set the PO filter.
				if (mFilter.po) {
					aFilter = [];
					aFilter.push(new Filter("WayBillNbr", FilterOperator.NE, ""));
					aFilter.push(new Filter("PONbr", FilterOperator.NE, ""));
					aFilter.push(new Filter("ItemID", FilterOperator.EQ, ""));
					aDataFilter.push(new Filter(aFilter, true)); // -and-
				}

				// Set the Article filter.
				if (mFilter.article) {
					aFilter = [];
					aFilter.push(new Filter("WayBillNbr", FilterOperator.NE, ""));
					aFilter.push(new Filter("PONbr", FilterOperator.NE, ""));
					aFilter.push(new Filter("ItemID", FilterOperator.NE, ""));
					aDataFilter.push(new Filter(aFilter, true)); // -and-
				}
				oDataFilter = new Filter(aDataFilter,false);
			}
			if (oDataFilter) {
				this._oList.getBinding("items").filter(oDataFilter, "Application");
			} else {
				this._oList.getBinding("items").filter([], "Application");
			}
		}
	});
});