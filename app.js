(function () {
  "use strict";

  var engine = null;
  var lastAnalyzedUrl = "";
  var detector = null;
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
  var parkingFeedback = document.getElementById("parking-feedback");
  var parkingStatus = document.getElementById("parking-status");
  var parkingResults = document.getElementById("parking-results");
  var clearFacility = document.getElementById("clear-facility");
  var resultEmpty = document.getElementById("result-empty");
  var resultCard = document.getElementById("result-card");
  var resultLabel = document.getElementById("result-label");
  var resultHeading = document.getElementById("result-heading");
  var resultMessage = document.getElementById("result-message");
  var resultReasons = document.getElementById("result-reasons");
  var resultDetails = document.getElementById("result-details");
  var referenceNote = document.getElementById("reference-note");
  var cameraDialog = document.getElementById("camera-dialog");
  var cameraClose = document.getElementById("camera-close");
  var cameraVideo = document.getElementById("camera-video");
  var cameraStatus = document.getElementById("camera-status");

  function showResult(result) {
    var rawStatus = result && result.status;
    var status = rawStatus === "suspicious" ? "danger" : rawStatus === "matched_reference" ? "reference" : rawStatus === "danger" || rawStatus === "warning" ? rawStatus : "unknown";
    var labels = { danger: "의심 징후 발견", warning: "주의", reference: "참고 목록과 일치", unknown: "확인 불가" };
    var titles = { danger: "의심스러운 주소예요", warning: "주의해서 확인하세요", reference: "참고 목록과 일치해요", unknown: "확인할 수 없어요" };
    var messages = {
      danger: "주소를 열거나 개인정보를 입력하지 말고 아래 이유를 확인해 주세요.",
      warning: "주소를 열기 전에 아래 내용을 확인해 주세요.",
      reference: "공식 운영기관의 참고 도메인과 일치하지만 공식 결제 페이지나 안전을 보장하지 않습니다.",
      unknown: "공식 주소인지 판단할 근거가 부족합니다. 관리기관에 직접 확인해 주세요."
    };
    var details = {};
    var detailKeys;

    result = result || {};
    Object.keys(result.details || {}).forEach(function (key) {
      details[key] = result.details[key];
    });
    if (result.checkedUrl) details["검사 주소"] = result.checkedUrl;
    if (result.matchedDomain) details["비교된 참고 도메인"] = result.matchedDomain;
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
    resultReasons.replaceChildren();
    (Array.isArray(result.reasons) ? result.reasons : []).forEach(function (reason) {
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
      description.textContent = details[key];
      resultDetails.append(term, description);
    });
    referenceNote.hidden = !result.facility && !result.matchedDomain;
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
    if (!engine || typeof engine[method] !== "function") {
      showPreviewOnly(fallbackSource, value);
      return Promise.resolve(null);
    }

    if (method === "analyzeUrl") lastAnalyzedUrl = value;
    return Promise.resolve(engine[method](value)).then(function (result) {
      showResult(result);
      return result;
    }).catch(function (error) {
      handleEngineError(error);
      return null;
    });
  }

  function getDetector() {
    if (!("BarcodeDetector" in window)) return null;
    try {
      if (!detector) detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    } catch (error) {
      return null;
    }
    return detector;
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
    var activeDetector;
    if (!isScanning) return;
    if (detectionBusy || cameraVideo.readyState < 2 || time - lastScanTime < 200) {
      scanFrameId = requestAnimationFrame(scanCameraFrame);
      return;
    }

    activeDetector = getDetector();
    lastScanTime = time;
    detectionBusy = true;
    activeDetector.detect(cameraVideo).then(function (codes) {
      detectionBusy = false;
      if (!isScanning) return;
      if (codes.length && codes[0].rawValue) {
        handleDecoded(codes[0].rawValue, "카메라 QR");
        stopCamera();
        cameraDialog.close();
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
    var activeDetector;
    if (isScanning) return;

    activeDetector = getDetector();
    if (!activeDetector) {
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
    var activeDetector = getDetector();
    var bitmap = null;

    if (!activeDetector || !("createImageBitmap" in window)) {
      showRecognitionError("이 브라우저는 이미지 QR 인식을 지원하지 않아요", "최신 브라우저에서 다시 시도하거나 URL을 직접 입력해 주세요.", "QR 이미지");
      return;
    }
    if (!file.type || file.type.indexOf("image/") !== 0) {
      showRecognitionError("이미지 파일이 아니에요", "PNG, JPG 등 올바른 이미지 파일을 선택해 주세요.", "QR 이미지");
      return;
    }

    createImageBitmap(file).then(function (createdBitmap) {
      bitmap = createdBitmap;
      return activeDetector.detect(bitmap);
    }).then(function (codes) {
      if (!codes.length || !codes[0].rawValue) {
        showRecognitionError("QR코드를 찾지 못했어요", "QR이 선명하게 보이는 이미지를 다시 선택해 주세요.", "QR 이미지");
        return;
      }
      handleDecoded(codes[0].rawValue, "QR 이미지");
    }).catch(function () {
      showRecognitionError("이미지를 읽을 수 없어요", "손상되지 않은 PNG 또는 JPG 이미지를 선택해 주세요.", "QR 이미지");
    }).finally(function () {
      if (bitmap) bitmap.close();
    });
  }

  function showParkingStatus(message) {
    parkingFeedback.hidden = false;
    parkingStatus.textContent = message;
  }

  function selectFacility(facility, button) {
    if (!engine || typeof engine.selectFacility !== "function") {
      showParkingStatus("시설 선택 기능이 연결되지 않았습니다.");
      return;
    }

    Promise.resolve(engine.selectFacility(facility.id)).then(function () {
      Array.prototype.forEach.call(parkingResults.querySelectorAll("button"), function (item) {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      clearFacility.hidden = false;
      showParkingStatus(facility.name + "을(를) 선택했습니다.");
      if (lastAnalyzedUrl) runEngine("analyzeUrl", lastAnalyzedUrl, "시설 선택 후 URL 분석");
    }).catch(function (error) {
      showParkingStatus(error && error.message ? error.message : "시설을 선택하지 못했습니다.");
    });
  }

  function showParkingResults(facilities) {
    parkingResults.replaceChildren();
    clearFacility.hidden = true;
    if (!Array.isArray(facilities) || facilities.length === 0) {
      showParkingStatus("검색 결과가 없습니다. 다른 지역명이나 시설명을 입력해 주세요.");
      return;
    }

    showParkingStatus(facilities.length + "개의 주차장을 찾았습니다. 분석에 사용할 시설을 선택해 주세요.");
    facilities.forEach(function (facility) {
      var item = document.createElement("li");
      var button = document.createElement("button");
      var name = document.createElement("strong");
      var address = document.createElement("span");
      var operator = document.createElement("span");

      button.type = "button";
      button.className = "parking-result";
      button.setAttribute("aria-pressed", "false");
      name.textContent = facility.name || "이름 없는 주차장";
      address.textContent = facility.roadAddress || facility.jibunAddress || "주소 정보 없음";
      operator.textContent = "관리기관: " + (facility.operator || "정보 없음");
      button.append(name, address, operator);
      button.addEventListener("click", function () {
        selectFacility(facility, button);
      });
      item.append(button);
      parkingResults.append(item);
    });
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
    showParkingStatus("주차장 데이터를 검색하고 있어요.");
    parkingResults.replaceChildren();
    Promise.resolve(engine.searchParkingLots(query)).then(showParkingResults).catch(function (error) {
      showParkingStatus(error && error.message ? error.message : "주차장 데이터를 불러오지 못했습니다.");
    });
  });

  clearFacility.addEventListener("click", function () {
    if (!engine || typeof engine.selectFacility !== "function") return;
    Promise.resolve(engine.selectFacility(null)).then(function () {
      Array.prototype.forEach.call(parkingResults.querySelectorAll("button"), function (item) {
        item.setAttribute("aria-pressed", "false");
      });
      clearFacility.hidden = true;
      showParkingStatus("시설 선택을 해제했습니다. URL만 분석할 수 있습니다.");
      if (lastAnalyzedUrl) runEngine("analyzeUrl", lastAnalyzedUrl, "URL 단독 분석");
    }).catch(function (error) {
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
