/*global QUnit*/

sap.ui.define([
	"com/golive/demiroren/zficspkokpit/controller/zfi_csp_kokpit.controller"
], function (Controller) {
	"use strict";

	QUnit.module("zfi_csp_kokpit Controller");

	QUnit.test("I should test the zfi_csp_kokpit controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
