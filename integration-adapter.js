import { analyzeQR } from "./security-engine.js";
import { findFacility, loadParkingData, searchFacilities } from "./facility-data.js";

var facilities = [];
var trustedDomains = [];
var selectedFacilityId = null;

var dataReady = Promise.all([
  loadParkingData(),
  fetch("data/trusted-domains.json").then(function (response) {
    if (!response.ok) throw new Error("참고 도메인 데이터를 불러오지 못했습니다 (" + response.status + ")");
    return response.json();
  })
]).then(function (loaded) {
  facilities = loaded[0].facilities;
  trustedDomains = loaded[1];
});

var adapter = {
  analyzeUrl: function (url) {
    return dataReady.then(function () {
      return analyzeQR({ url: url, facilityId: selectedFacilityId }, facilities, trustedDomains);
    });
  },

  searchParkingLots: function (query) {
    return dataReady.then(function () {
      return searchFacilities(facilities, query);
    });
  },

  selectFacility: function (facilityId) {
    return dataReady.then(function () {
      var facility;
      if (!facilityId) {
        selectedFacilityId = null;
        return null;
      }
      facility = findFacility(facilities, facilityId);
      if (!facility) throw new Error("선택한 주차장 ID를 데이터에서 찾지 못했습니다.");
      selectedFacilityId = facility.id;
      return facility;
    });
  }
};

window.QRBeforeApp.connectEngine(adapter);
