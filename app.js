(function () {
  "use strict";

  var engine = null;
  var lastAnalyzedUrl = "";
  var analysisRequestId = 0;
  var parkingRequestId = 0;
  var facilityRequestId = 0;
  var selectedFacilityId = null;
  var listedFacilities = [];
  var parkingVisibleCount = 0;
  var parkingBatchSize = 10;
  var nearbyMode = false;
  var detector = null;
  var detectorChecked = false;
  var qrCanvas = document.createElement("canvas");
  var qrContext = qrCanvas.getContext("2d", { willReadFrequently: true });
  var cameraStream = null;
  var scanFrameId = null;
  var isScanning = false;
  var detectionBusy = false;
  var lastScanTime = 0;
  var scanButton = document.getElementById("scan-button");
  var imageInput = document.getElementById("qr-image");
  var fileName = document.getElementById("file-name");
  var decodedCard = document.getElementById("decoded-card");
  var decodedValue = document.getElementById("decoded-value");
  var decodedNote = document.getElementById("decoded-note");
  var urlForm = document.getElementById("url-form");
  var urlInput = document.getElementById("url-input");
  var parkingForm = document.getElementById("parking-form");
  var parkingInput = document.getElementById("parking-input");
  var nearbyButton = document.getElementById("nearby-button");
  var parkingFeedback = document.getElementById("parking-feedback");
  var parkingStatus = document.getElementById("parking-status");
  var parkingResults = document.getElementById("parking-results");
  var parkingMore = document.getElementById("parking-more");
  var clearFacility = document.getElementById("clear-facility");
  var resultEmpty = document.getElementById("result-empty");
  var resultEmptyHeading = document.getElementById("result-empty-heading");
  var resultEmptyMessage = document.getElementById("result-empty-message");
  var resultCard = document.getElementById("result-card");
  var resultLabel = document.getElementById("result-label");
  var resultHeading = document.getElementById("result-heading");
  var resultMessage = document.getElementById("result-message");
  var operatorWarning = document.getElementById("operator-warning");
  var operatorWarningMessage = document.getElementById("operator-warning-message");
  var resultReasons = document.getElementById("result-reasons");
  var resultDetails = document.getElementById("result-details");
  var referenceNote = document.getElementById("reference-note");
  var cameraDialog = document.getElementById("camera-dialog");
  var cameraClose = document.getElementById("camera-close");
  var cameraVideo = document.getElementById("camera-video");
  var cameraStatus = document.getElementById("camera-status");

  function isOperatorMismatchReason(reason) {
    return typeof reason === "string" && reason.indexOf("선택한 주차장의 관리기관") !== -1 && reason.indexOf("다른 기관의 도메인") !== -1;
  }

  function showResult(result) {
    var rawStatus = result && result.status;
    var status = rawStatus === "suspicious" ? "danger" : rawStatus === "matched_reference" ? "reference" : rawStatus === "danger" || rawStatus === "warning" ? rawStatus : "unknown";
    var labels = { danger: "의심 징후 발견", warning: "주의", reference: "참고 목록과 일치", unknown: "확인 불가" };
    var titles = { danger: "의심스러운 주소예요", warning: "주의해서 확인하세요", reference: "참고 목록과 일치해요", unknown: "확인할 수 없어요" };
    var messages = {
      danger: "주소를 열거나 개인정보를 입력하지 말고 아래 이유를 확인해 주세요.",
      warning: "주소를 열기 전에 아래 내용을 확인해 주세요.",
      reference: "등록된 기관의 참고 도메인과 일치해요. 결제 페이지 여부는 별도로 확인해 주세요.",
      unknown: "공식 주소인지 판단할 근거가 부족합니다. 관리기관에 직접 확인해 주세요."
    };
    var details = {};
    var detailKeys;
    var reasons;
    var operatorMismatchReasons;

    result = result || {};
    reasons = Array.isArray(result.reasons) ? result.reasons : [];
    operatorMismatchReasons = reasons.filter(isOperatorMismatchReason);
    Object.keys(result.details || {}).forEach(function (key) {
      details[key] = result.details[key];
    });
    if (result.checkedUrl) details["검사 주소"] = result.checkedUrl;
    if (result.matchedDomain) details["참고 도메인"] = result.matchedDomain;
    if (result.facility) {
      details["선택 시설"] = result.facility.name || result.facility.id;
      details["시설 관리기관"] = result.facility.operator || "정보 없음";
      if (result.facility.phone) details["관리기관 연락처"] = result.facility.phone;
    }
    detailKeys = Object.keys(details);

    resultEmpty.hidden = true;
    resultCard.hidden = false;
    resultCard.className = "result-card result-" + status;
    resultLabel.textContent = labels[status];
    resultHeading.textContent = result.title || titles[status];
    resultMessage.textContent = result.message || messages[status];
    operatorWarningMessage.textContent = operatorMismatchReasons.join(" ");
    operatorWarning.hidden = operatorMismatchReasons.length === 0;
    resultReasons.replaceChildren();
    reasons.filter(function (reason) {
      return !isOperatorMismatchReason(reason);
    }).forEach(function (reason) {
      var item = document.createElement("li");
      item.textContent = reason;
      resultReasons.append(item);
    });
    resultReasons.hidden = resultReasons.children.length === 0;
    resultDetails.replaceChildren();

    detailKeys.forEach(function (key) {
      var term = document.createElement("dt");
      var description = document.createElement("dd");
      term.textContent = key;
      if (key === "검사 주소" || key === "확인 대상") {
        description.className = "breakable-url";
        appendBreakableText(description, details[key]);
      } else {
        description.textContent = details[key];
      }
      resultDetails.append(term, description);
    });
    referenceNote.hidden = !result.facility && !result.matchedDomain;
  }

  function appendBreakableText(element, value) {
    String(value).split(/([/?&#=])/).forEach(function (part) {
      element.append(document.createTextNode(part));
      if (/^[/?&#=]$/.test(part)) element.append(document.createElement("wbr"));
    });
  }

  function showPreviewOnly(source, value) {
    showResult({
      status: "unknown",
      title: "분석 엔진 연결 전",
      message: "현재는 화면 확인용 단계입니다. 입력한 주소나 파일을 열지 않았습니다.",
      details: { "입력 방식": source, "확인 대상": value }
    });
  }

  function handleEngineError(error) {
    showResult({
      status: "unknown",
      title: "결과를 불러오지 못했어요",
      message: error && error.message ? error.message : "잠시 후 다시 시도하거나 공식 사이트에서 직접 확인해 주세요."
    });
  }

  function runEngine(method, value, fallbackSource) {
    var requestId = analysisRequestId;
    if (method === "analyzeUrl") {
      lastAnalyzedUrl = value;
      requestId = ++analysisRequestId;
    }
    if (!engine || typeof engine[method] !== "function") {
      showPreviewOnly(fallbackSource, value);
      return Promise.resolve(null);
    }

    return Promise.resolve(engine[method](value)).then(function (result) {
      if (method === "analyzeUrl" && requestId !== analysisRequestId) return null;
      showResult(result);
      return result;
    }).catch(function (error) {
      if (method === "analyzeUrl" && requestId !== analysisRequestId) return null;
      handleEngineError(error);
      return null;
    });
  }

  function getDetector() {
    if (detectorChecked) return detector;
    detectorChecked = true;
    if (!("BarcodeDetector" in window)) return null;
    try {
      detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    } catch (error) {
      return null;
    }
    return detector;
  }

  function hasJsQr() {
    return typeof window.jsQR === "function" && Boolean(qrContext);
  }

  function decodeWithJsQr(source, width, height) {
    var imageData;
    var code;
    if (!hasJsQr() || !width || !height) return "";
    qrCanvas.width = width;
    qrCanvas.height = height;
    qrContext.drawImage(source, 0, 0, width, height);
    imageData = qrContext.getImageData(0, 0, width, height);
    code = window.jsQR(imageData.data, width, height);
    return code && typeof code.data === "string" ? code.data : "";
  }

  function detectQr(source, width, height) {
    var activeDetector = getDetector();
    if (activeDetector) {
      return activeDetector.detect(source).then(function (codes) {
        if (codes.length && codes[0].rawValue) return codes[0].rawValue;
        return decodeWithJsQr(source, width, height);
      }, function (error) {
        if (!hasJsQr()) throw error;
        return decodeWithJsQr(source, width, height);
      });
    }
    if (!hasJsQr()) return Promise.reject(new Error("QR decoder unavailable"));
    return Promise.resolve().then(function () {
      return decodeWithJsQr(source, width, height);
    });
  }

  function loadImageFile(file) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      var objectUrl = URL.createObjectURL(file);
      image.onload = function () {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image load failed"));
      };
      image.src = objectUrl;
    });
  }

  function getHttpUrl(value) {
    var parsed;
    try {
      parsed = new URL(value.trim());
    } catch (error) {
      return null;
    }
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? value.trim() : null;
  }

  function hasDangerousScheme(value) {
    var compact = value.replace(/[\u0000- ]/g, "").toLowerCase();
    return /^(javascript|data|vbscript|file|blob|filesystem):/.test(compact);
  }

  function showDecoded(value, source, isUrl) {
    decodedCard.hidden = false;
    decodedValue.textContent = value || "(빈 내용)";
    decodedNote.textContent = isUrl
      ? source + "에서 URL을 찾았습니다. 주소를 열지 않고 분석만 요청합니다."
      : source + "에서 읽었지만 웹 URL은 아닙니다. 실행하지 않았습니다.";
  }

  function handleDecoded(value, source) {
    var rawValue = typeof value === "string" ? value.trim() : "";
    var safeUrl = getHttpUrl(rawValue);
    var dangerousScheme = hasDangerousScheme(rawValue);

    showDecoded(rawValue, source, Boolean(safeUrl || dangerousScheme));
    if (safeUrl || dangerousScheme) {
      urlInput.value = rawValue;
      if (dangerousScheme) decodedNote.textContent = source + "에서 위험할 수 있는 주소 형식을 찾았습니다. 실행하지 않고 문자열만 분석합니다.";
      runEngine("analyzeUrl", safeUrl || rawValue, source);
      return;
    }

    showResult({
      status: "unknown",
      title: "웹 URL이 아니에요",
      message: "QR 내용을 실행하거나 외부로 전송하지 않았습니다.",
      details: { "입력 방식": source, "읽은 내용": rawValue || "빈 내용" }
    });
  }

  function showRecognitionError(title, message, source) {
    showResult({
      status: "unknown",
      title: title,
      message: message,
      details: source ? { "입력 방식": source } : {}
    });
  }

  function stopCamera() {
    isScanning = false;
    detectionBusy = false;
    scanButton.disabled = false;
    if (scanFrameId !== null) cancelAnimationFrame(scanFrameId);
    scanFrameId = null;
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track) {
        track.stop();
      });
    }
    cameraStream = null;
    cameraVideo.srcObject = null;
  }

  function scanCameraFrame(time) {
    if (!isScanning) return;
    if (detectionBusy || cameraVideo.readyState < 2 || time - lastScanTime < 200) {
      scanFrameId = requestAnimationFrame(scanCameraFrame);
      return;
    }

    lastScanTime = time;
    detectionBusy = true;
    detectQr(cameraVideo, cameraVideo.videoWidth, cameraVideo.videoHeight).then(function (rawValue) {
      detectionBusy = false;
      if (!isScanning) return;
      if (rawValue) {
        stopCamera();
        cameraDialog.close();
        handleDecoded(rawValue, "카메라 QR");
        return;
      }
      scanFrameId = requestAnimationFrame(scanCameraFrame);
    }).catch(function () {
      stopCamera();
      cameraDialog.close();
      showRecognitionError("QR 인식을 계속할 수 없어요", "이미지 업로드나 URL 직접 입력을 이용해 주세요.", "카메라 QR");
    });
  }

  function cameraErrorMessage(error) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") return "카메라 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용하거나 다른 입력 방법을 이용해 주세요.";
    if (error.name === "NotFoundError") return "사용 가능한 카메라를 찾지 못했습니다. 이미지 업로드나 URL 직접 입력을 이용해 주세요.";
    if (error.name === "NotReadableError") return "다른 앱이 카메라를 사용 중일 수 있습니다. 카메라를 닫고 다시 시도해 주세요.";
    return "카메라를 시작하지 못했습니다. 이미지 업로드나 URL 직접 입력을 이용해 주세요.";
  }

  function startCamera() {
    if (isScanning) return;

    if (!getDetector() && !hasJsQr()) {
      showRecognitionError("이 브라우저는 QR 인식을 지원하지 않아요", "최신 브라우저에서 다시 시도하거나 URL을 직접 입력해 주세요.");
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showRecognitionError("카메라를 사용할 수 없는 환경이에요", "HTTPS 또는 localhost에서 열고, 이미지 업로드나 URL 직접 입력을 이용해 주세요.");
      return;
    }

    isScanning = true;
    scanButton.disabled = true;
    cameraStatus.textContent = "카메라 권한을 확인하고 있어요.";
    if (!cameraDialog.open) cameraDialog.showModal();

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } }
    }).then(function (stream) {
      if (!isScanning) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        return;
      }
      cameraStream = stream;
      cameraVideo.srcObject = stream;
      return cameraVideo.play();
    }).then(function () {
      if (!isScanning) return;
      cameraStatus.textContent = "QR코드가 선명하게 보이도록 맞춰 주세요.";
      scanFrameId = requestAnimationFrame(scanCameraFrame);
    }).catch(function (error) {
      cameraStatus.textContent = cameraErrorMessage(error);
      stopCamera();
    });
  }

  function decodeImage(file) {
    if (!getDetector() && !hasJsQr()) {
      showRecognitionError("이 브라우저는 이미지 QR 인식을 지원하지 않아요", "최신 브라우저에서 다시 시도하거나 URL을 직접 입력해 주세요.", "QR 이미지");
      return;
    }
    if (!file.type || file.type.indexOf("image/") !== 0) {
      showRecognitionError("이미지 파일이 아니에요", "PNG, JPG 등 올바른 이미지 파일을 선택해 주세요.", "QR 이미지");
      return;
    }

    loadImageFile(file).then(function (image) {
      return detectQr(image, image.naturalWidth, image.naturalHeight);
    }).then(function (rawValue) {
      if (!rawValue) {
        showRecognitionError("QR코드를 찾지 못했어요", "QR이 선명하게 보이는 이미지를 다시 선택해 주세요.", "QR 이미지");
        return;
      }
      handleDecoded(rawValue, "QR 이미지");
    }).catch(function () {
      showRecognitionError("이미지를 읽을 수 없어요", "손상되지 않은 PNG 또는 JPG 이미지를 선택해 주세요.", "QR 이미지");
    });
  }

  function showParkingStatus(message) {
    parkingFeedback.hidden = false;
    parkingStatus.textContent = message;
  }

  function selectFacility(facility, button) {
    var requestId;
    if (!engine || typeof engine.selectFacility !== "function") {
      showParkingStatus("시설 선택 기능이 연결되지 않았습니다.");
      return;
    }

    requestId = ++facilityRequestId;
    Promise.resolve(engine.selectFacility(facility.id)).then(function () {
      if (requestId !== facilityRequestId) return;
      selectedFacilityId = facility.id;
      Array.prototype.forEach.call(parkingResults.querySelectorAll("button"), function (item) {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      clearFacility.hidden = false;
      showParkingStatus(facility.name + "을(를) 선택했습니다.");
      if (lastAnalyzedUrl) runEngine("analyzeUrl", lastAnalyzedUrl, "시설 선택 후 URL 분석");
    }).catch(function (error) {
      if (requestId !== facilityRequestId) return;
      showParkingStatus(error && error.message ? error.message : "시설을 선택하지 못했습니다.");
    });
  }

  function formatDistance(distanceKm) {
    if (distanceKm < 1) return Math.round(distanceKm * 1000) + "m 직선거리";
    return distanceKm.toFixed(distanceKm < 10 ? 1 : 0) + "km 직선거리";
  }

  function renderParkingResults() {
    var visibleFacilities = listedFacilities.slice(0, parkingVisibleCount);
    parkingResults.replaceChildren();
    clearFacility.hidden = !selectedFacilityId;
    visibleFacilities.forEach(function (facility) {
      var item = document.createElement("li");
      var button = document.createElement("button");
      var name = document.createElement("strong");
      var address = document.createElement("span");
      var operator = document.createElement("span");
      var distance;

      button.type = "button";
      button.className = "parking-result";
      button.setAttribute("aria-pressed", facility.id === selectedFacilityId ? "true" : "false");
      name.textContent = facility.name || "이름 없는 주차장";
      address.textContent = facility.roadAddress || facility.jibunAddress || "주소 정보 없음";
      operator.textContent = "관리기관: " + (facility.operator || "정보 없음");
      button.append(name, address, operator);
      if (nearbyMode && Number.isFinite(facility.distanceKm)) {
        distance = document.createElement("span");
        distance.className = "parking-distance";
        distance.textContent = formatDistance(facility.distanceKm);
        button.append(distance);
      }
      button.addEventListener("click", function () {
        selectFacility(facility, button);
      });
      item.append(button);
      parkingResults.append(item);
    });
    parkingMore.hidden = parkingVisibleCount >= listedFacilities.length;
  }

  function showParkingResults(facilities, isNearby) {
    listedFacilities = Array.isArray(facilities) ? facilities : [];
    nearbyMode = Boolean(isNearby);
    parkingVisibleCount = nearbyMode ? parkingBatchSize : listedFacilities.length;
    if (!Array.isArray(facilities) || facilities.length === 0) {
      showParkingStatus("검색 결과가 없습니다. 다른 지역명이나 시설명을 입력해 주세요.");
      parkingResults.replaceChildren();
      parkingMore.hidden = true;
      return;
    }

    showParkingStatus(nearbyMode
      ? "가까운 주차장 " + Math.min(parkingVisibleCount, listedFacilities.length) + "곳입니다. 거리는 실제 경로가 아닌 직선거리입니다."
      : listedFacilities.length + "개의 주차장을 찾았습니다. 분석에 사용할 시설을 선택해 주세요.");
    renderParkingResults();
  }

  function locationErrorMessage(error) {
    if (error && error.code === 1) return "위치 권한이 거부되었습니다. 기존 검색은 계속 사용할 수 있습니다.";
    if (error && error.code === 2) return "현재 위치를 확인할 수 없습니다. GPS 상태를 확인하거나 기존 검색을 이용해 주세요.";
    if (error && error.code === 3) return "위치 조회 시간이 초과되었습니다. 다시 시도하거나 기존 검색을 이용해 주세요.";
    return "현재 위치를 확인하지 못했습니다. 기존 검색을 이용해 주세요.";
  }

  function resetResultForChangedUrl() {
    if (!lastAnalyzedUrl && resultCard.hidden) return;
    analysisRequestId += 1;
    lastAnalyzedUrl = "";
    resultCard.hidden = true;
    resultEmpty.hidden = false;
    resultEmptyHeading.textContent = "주소가 변경됐어요";
    resultEmptyMessage.textContent = "새 주소를 확인하려면 확인 버튼을 눌러 주세요.";
  }

  scanButton.addEventListener("click", startCamera);
  cameraClose.addEventListener("click", function () {
    stopCamera();
    cameraDialog.close();
  });
  cameraDialog.addEventListener("close", stopCamera);

  imageInput.addEventListener("change", function () {
    var file = imageInput.files[0];
    if (!file) return;
    fileName.textContent = file.name;
    decodedCard.hidden = true;
    decodeImage(file);
  });

  urlInput.addEventListener("input", resetResultForChangedUrl);

  urlForm.addEventListener("submit", function (event) {
    var safeUrl;
    var rawValue;
    event.preventDefault();
    if (!urlForm.reportValidity()) return;
    rawValue = urlInput.value.trim();
    safeUrl = getHttpUrl(rawValue);
    if (!safeUrl && !hasDangerousScheme(rawValue)) {
      showRecognitionError("웹 URL을 확인해 주세요", "http:// 또는 https://로 시작하는 주소만 분석할 수 있습니다.", "URL 직접 입력");
      return;
    }
    runEngine("analyzeUrl", safeUrl || rawValue, "URL 직접 입력");
  });

  parkingForm.addEventListener("submit", function (event) {
    var requestId;
    event.preventDefault();
    var query = parkingInput.value.trim();
    if (!query) {
      parkingInput.focus();
      return;
    }
    if (!engine || typeof engine.searchParkingLots !== "function") {
      showParkingStatus("주차장 데이터가 아직 연결되지 않았습니다.");
      return;
    }
    requestId = ++parkingRequestId;
    nearbyButton.disabled = false;
    showParkingStatus("주차장 데이터를 검색하고 있어요.");
    parkingResults.replaceChildren();
    parkingMore.hidden = true;
    Promise.resolve(engine.searchParkingLots(query)).then(function (facilities) {
      if (requestId !== parkingRequestId) return;
      showParkingResults(facilities, false);
    }).catch(function (error) {
      if (requestId !== parkingRequestId) return;
      showParkingStatus(error && error.message ? error.message : "주차장 데이터를 불러오지 못했습니다.");
    });
  });

  nearbyButton.addEventListener("click", function () {
    var requestId;
    if (!navigator.geolocation) {
      showParkingStatus("이 브라우저는 위치 기능을 지원하지 않습니다. 기존 검색을 이용해 주세요.");
      return;
    }
    if (!engine || typeof engine.getNearbyParkingLots !== "function") {
      showParkingStatus("거리 계산 기능이 아직 연결되지 않았습니다. 기존 검색을 이용해 주세요.");
      return;
    }

    requestId = ++parkingRequestId;
    nearbyButton.disabled = true;
    showParkingStatus("현재 위치를 확인하고 있어요. 위치 정보는 저장하거나 전송하지 않습니다.");
    navigator.geolocation.getCurrentPosition(function (position) {
      var latitude = Number(position.coords.latitude);
      var longitude = Number(position.coords.longitude);
      if (requestId !== parkingRequestId) return;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
        || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        nearbyButton.disabled = false;
        showParkingStatus("현재 위치 좌표가 올바르지 않습니다. 기존 검색을 이용해 주세요.");
        return;
      }
      Promise.resolve(engine.getNearbyParkingLots(latitude, longitude)).then(function (facilities) {
        if (requestId !== parkingRequestId) return;
        nearbyButton.disabled = false;
        showParkingResults(facilities, true);
      }).catch(function (error) {
        if (requestId !== parkingRequestId) return;
        nearbyButton.disabled = false;
        showParkingStatus(error && error.message ? error.message : "가까운 주차장을 계산하지 못했습니다.");
      });
    }, function (error) {
      if (requestId !== parkingRequestId) return;
      nearbyButton.disabled = false;
      showParkingStatus(locationErrorMessage(error));
    }, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000
    });
  });

  parkingMore.addEventListener("click", function () {
    parkingVisibleCount = Math.min(parkingVisibleCount + parkingBatchSize, listedFacilities.length);
    showParkingStatus("가까운 주차장 " + parkingVisibleCount + "곳입니다. 거리는 실제 경로가 아닌 직선거리입니다.");
    renderParkingResults();
  });

  clearFacility.addEventListener("click", function () {
    var requestId;
    if (!engine || typeof engine.selectFacility !== "function") return;
    requestId = ++facilityRequestId;
    Promise.resolve(engine.selectFacility(null)).then(function () {
      if (requestId !== facilityRequestId) return;
      selectedFacilityId = null;
      Array.prototype.forEach.call(parkingResults.querySelectorAll("button"), function (item) {
        item.setAttribute("aria-pressed", "false");
      });
      clearFacility.hidden = true;
      showParkingStatus("시설 선택을 해제했습니다. URL만 분석할 수 있습니다.");
      if (lastAnalyzedUrl) runEngine("analyzeUrl", lastAnalyzedUrl, "URL 단독 분석");
    }).catch(function (error) {
      if (requestId !== facilityRequestId) return;
      showParkingStatus(error && error.message ? error.message : "시설 선택을 해제하지 못했습니다.");
    });
  });

  window.addEventListener("pagehide", stopCamera);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopCamera();
  });

  // 팀원 엔진은 이 함수에 analyzeUrl, searchParkingLots 메서드를 전달합니다.
  window.QRBeforeApp = {
    connectEngine: function (securityEngine) {
      engine = securityEngine;
    }
  };
}());
