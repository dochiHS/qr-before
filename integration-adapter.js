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

  getNearbyParkingLots: function (latitude, longitude) {
    return dataReady.then(function () {
      if (!validCoordinate(latitude, longitude)) throw new Error("현재 위치 좌표가 올바르지 않습니다.");
      return facilities.map(function (facility) {
        var facilityLatitude = Number(facility.lat);
        var facilityLongitude = Number(facility.lng);
        if (!validCoordinate(facilityLatitude, facilityLongitude)) return null;
        return Object.assign({}, facility, {
          distanceKm: haversine(latitude, longitude, facilityLatitude, facilityLongitude)
        });
      }).filter(function (facility) {
        return facility !== null;
      }).sort(function (left, right) {
        return left.distanceKm - right.distanceKm;
      });
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

function validCoordinate(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

function haversine(latitude1, longitude1, latitude2, longitude2) {
  var radiusKm = 6371;
  var toRadians = Math.PI / 180;
  var latitudeDelta = (latitude2 - latitude1) * toRadians;
  var longitudeDelta = (longitude2 - longitude1) * toRadians;
  var firstLatitude = latitude1 * toRadians;
  var secondLatitude = latitude2 * toRadians;
  var value = Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2)
    + Math.cos(firstLatitude) * Math.cos(secondLatitude)
    * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
  return radiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

window.QRBeforeApp.connectEngine(adapter);
