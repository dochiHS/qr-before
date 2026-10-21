(function () {
  "use strict";

  var CELL = 0.5;
  var PX = 22;
  var MARGIN = 2;
  var NAMES = { living: "거실", kitchen: "주방", room1: "방1", room2: "방2", room3: "방3", bath1: "욕실1", bath2: "욕실2", entry: "현관" };
  var COLORS = { living: "--living", kitchen: "--kitchen", room1: "--room1", room2: "--room2", room3: "--room3", bath1: "--bath", bath2: "--bath", entry: "--entry" };
  var PLAN_COLORS = { living: "--living", kitchen: "--kitchen", room: "--room1", bath: "--bath", entry: "--entry" };
  var PLAN_NAMES = { living: "거실", kitchen: "주방", room: "방", bath: "욕실", entry: "현관" };
  var SVG_NS = "http://www.w3.org/2000/svg";
  var state = { rooms: 3, baths: 2, cols: 0, rows: 0, pieces: [], selected: null, trayRows: 0, recommendation: null, guide: null, mineRects: [], matches: [], selectedMatch: null, viewMode: "side", planScope: "all", gu: "서구", similar: null, selectedApartment: null, estimate: null, quotePrice: null, quoteSource: "" };
  var logicApi = null;
  var areaGuides = [];
  var recommendationRequestId = 0;
  var matchRequestId = 0;
  var similarRequestId = 0;
  var estimateRequestId = 0;
  var drag = null;
  var resize = null;

  var roomsControl = document.getElementById("rooms");
  var bathsControl = document.getElementById("baths");
  var dataStatus = document.getElementById("data-status");
  var recommendationTitle = document.getElementById("recommendation-title");
  var recommendationNote = document.getElementById("recommendation-note");
  var areaSummary = document.getElementById("area-summary");
  var exclusiveArea = document.getElementById("exclusive-area");
  var supplyLabel = document.getElementById("supply-label");
  var areaSource = document.getElementById("area-source");
  var pieceList = document.getElementById("piece-list");
  var goStep2 = document.getElementById("go-step-2");
  var step1 = document.getElementById("step-1");
  var step2 = document.getElementById("step-2");
  var step3 = document.getElementById("step-3");
  var step4 = document.getElementById("step-4");
  var backStep1 = document.getElementById("back-step-1");
  var board = document.getElementById("board");
  var boardDimensions = document.getElementById("board-dimensions");
  var selectionStatus = document.getElementById("selection-status");
  var resetSizeButton = document.getElementById("reset-size");
  var autoPlaceButton = document.getElementById("auto-place");
  var clearBoardButton = document.getElementById("clear-board");
  var checkList = document.getElementById("check-list");
  var goStep3 = document.getElementById("go-step-3");
  var backStep2 = document.getElementById("back-step-2");
  var backStep2Bottom = document.getElementById("back-step-2-bottom");
  var planScope = document.getElementById("plan-scope");
  var viewMode = document.getElementById("view-mode");
  var matchStatus = document.getElementById("match-status");
  var planMatchList = document.getElementById("plan-match-list");
  var planSource = document.getElementById("plan-source");
  var districtControl = document.getElementById("district-control");
  var similarStatus = document.getElementById("similar-status");
  var apartmentSource = document.getElementById("apartment-source");
  var marketSummary = document.getElementById("market-summary");
  var summaryCount = document.getElementById("summary-count");
  var summarySale = document.getElementById("summary-sale");
  var summaryJeonse = document.getElementById("summary-jeonse");
  var apartmentList = document.getElementById("apartment-list");
  var goStep4 = document.getElementById("go-step-4");
  var backStep3 = document.getElementById("back-step-3");
  var backStep3Bottom = document.getElementById("back-step-3-bottom");
  var estimateArea = document.getElementById("estimate-area");
  var estimatePlan = document.getElementById("estimate-plan");
  var estimateMatchPlan = document.getElementById("estimate-match-plan");
  var estimateMatchMeta = document.getElementById("estimate-match-meta");
  var estimateApartment = document.getElementById("estimate-apartment");
  var estimateApartmentMeta = document.getElementById("estimate-apartment-meta");
  var estimatePrice = document.getElementById("estimate-price");
  var estimatePriceLabel = document.getElementById("estimate-price-label");
  var targetYears = document.getElementById("target-years");
  var estimateResultMessage = document.getElementById("estimate-result-message");
  var estimateResultDetails = document.getElementById("estimate-result-details");
  var estimateMonthly = document.getElementById("estimate-monthly");
  var estimateYears = document.getElementById("estimate-years");
  var saveEstimateButton = document.getElementById("save-estimate");

  function idsFor(rooms, baths) {
    var ids = ["living", "kitchen"];
    var index;
    for (index = 1; index <= rooms; index += 1) ids.push("room" + index);
    for (index = 1; index <= baths; index += 1) ids.push("bath" + index);
    ids.push("entry");
    return ids;
  }

  function setDataStatus(message, status) {
    dataStatus.textContent = message;
    dataStatus.dataset.state = status || "";
  }

  function resetDownstream() {
    matchRequestId += 1;
    similarRequestId += 1;
    estimateRequestId += 1;
    state.mineRects = [];
    state.matches = [];
    state.selectedMatch = null;
    state.similar = null;
    state.selectedApartment = null;
    state.estimate = null;
    state.quotePrice = null;
    state.quoteSource = "";
    marketSummary.hidden = true;
    planMatchList.replaceChildren();
    apartmentList.replaceChildren();
    estimateMatchPlan.replaceChildren();
    targetYears.value = "";
    matchStatus.textContent = "평면도를 완성하면 실제 도면과 비교해요.";
    matchStatus.dataset.state = "";
    planSource.textContent = "LH 주택 평면도와 대전 기존 단지 평면도를 단순화해 비교합니다.";
    similarStatus.textContent = "실제 평면도를 선택하면 대전 실거래가를 찾아요.";
    apartmentSource.textContent = "실거래 데이터에는 방 개수가 없어 선택한 실제 평면도의 전용면적 ±5㎡와 지역으로 비교합니다.";
    goStep4.disabled = true;
    saveEstimateButton.disabled = true;
    estimateResultDetails.hidden = true;
  }

  function renderSegmented(control, values, current, onPick) {
    control.replaceChildren();
    values.forEach(function (value) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = value + "개";
      button.setAttribute("aria-pressed", String(value === current));
      button.addEventListener("click", function () { onPick(value); });
      control.append(button);
    });
  }

  function renderControls() {
    renderSegmented(roomsControl, [1, 2, 3], state.rooms, function (value) {
      state.rooms = value;
      renderControls();
      updateRecommendation();
    });
    renderSegmented(bathsControl, [1, 2], state.baths, function (value) {
      state.baths = value;
      renderControls();
      updateRecommendation();
    });
  }

  function showUnavailable(message) {
    resetDownstream();
    state.recommendation = null;
    state.guide = null;
    state.pieces = [];
    state.selected = null;
    recommendationTitle.textContent = "면적 데이터를 준비하고 있어요";
    recommendationNote.textContent = message;
    areaSummary.hidden = true;
    areaSource.hidden = true;
    pieceList.replaceChildren();
    var empty = document.createElement("p");
    empty.className = "empty-copy";
    empty.textContent = "실제 근거가 있는 공간 크기 데이터가 연결되면 표시됩니다.";
    pieceList.append(empty);
    goStep2.disabled = true;
  }

  function matchingGuide(rooms, baths) {
    return areaGuides.find(function (guide) {
      return Number(guide.rooms) === rooms && Number(guide.baths) === baths;
    });
  }

  function piecesFromGuide(guide) {
    var ids = idsFor(state.rooms, state.baths);
    return ids.map(function (id) {
      var size = guide.pieces && guide.pieces[id];
      var width;
      var height;
      if (!Array.isArray(size) || size.length < 2) throw new Error(NAMES[id] + " 크기가 없습니다.");
      width = Number(size[0]);
      height = Number(size[1]);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error(NAMES[id] + " 크기가 올바르지 않습니다.");
      if (Math.abs(width / CELL - Math.round(width / CELL)) > 0.001 || Math.abs(height / CELL - Math.round(height / CELL)) > 0.001) {
        throw new Error(NAMES[id] + " 크기는 0.5m 단위여야 합니다.");
      }
      return { id: id, w: Math.round(width / CELL), h: Math.round(height / CELL), w0: Math.round(width / CELL), h0: Math.round(height / CELL), x: null, y: null, tx: 0, ty: 0 };
    });
  }

  function configureBoard(area, pieces, guide) {
    var cellsTotal = Math.ceil(area / (CELL * CELL));
    var widest = Math.max.apply(null, pieces.map(function (piece) { return piece.w; }));
    var tallest = Math.max.apply(null, pieces.map(function (piece) { return piece.h; }));
    var box = guide && guide.box;
    var boxWidth = Array.isArray(box) ? Number(box[0]) : 0;
    var boxHeight = Array.isArray(box) ? Number(box[1]) : 0;
    if (boxWidth > 0 && boxHeight > 0 && Math.abs(boxWidth / CELL - Math.round(boxWidth / CELL)) < 0.001 && Math.abs(boxHeight / CELL - Math.round(boxHeight / CELL)) < 0.001) {
      state.cols = Math.max(widest, Math.round(boxWidth / CELL));
      state.rows = Math.max(tallest, Math.round(boxHeight / CELL));
    } else {
      state.cols = Math.max(widest, Math.ceil(Math.sqrt(cellsTotal * 1.5)));
      state.rows = Math.max(tallest, Math.ceil(cellsTotal / state.cols));
    }
    state.pieces = pieces;
    state.selected = null;
    layoutTray();
  }

  function renderRecommendation(result, guide) {
    var area = Number(result.area);
    var pyeong = Number(result.pyeong);
    recommendationTitle.textContent = "방 " + state.rooms + "개 · 화장실 " + state.baths + "개 추천";
    exclusiveArea.textContent = area.toFixed(area % 1 ? 1 : 0) + "㎡ · " + pyeong.toFixed(1) + "평";
    supplyLabel.textContent = result.label;
    recommendationNote.textContent = result.note || "선택한 조건에 맞춘 추천 면적입니다.";
    areaSummary.hidden = false;
    areaSource.textContent = guide.source ? "공간 크기 근거: " + guide.source : "공간 크기 출처 정보가 아직 없습니다.";
    areaSource.hidden = false;
  }

  function renderPieceList() {
    pieceList.replaceChildren();
    state.pieces.forEach(function (piece) {
      var item = document.createElement("div");
      var swatch = document.createElement("span");
      var copy = document.createElement("div");
      var name = document.createElement("strong");
      var size = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = "var(" + COLORS[piece.id] + ")";
      name.textContent = NAMES[piece.id];
      size.textContent = (piece.w * CELL).toFixed(1) + " × " + (piece.h * CELL).toFixed(1) + "m · " + (piece.w * piece.h * CELL * CELL).toFixed(1) + "㎡";
      copy.append(name, size);
      item.className = "piece-summary-item";
      item.append(swatch, copy);
      pieceList.append(item);
    });
  }

  function updateRecommendation() {
    var requestId = ++recommendationRequestId;
    showUnavailable("선택한 조건의 추천 데이터를 확인하고 있어요.");
    if (!logicApi || !areaGuides.length) {
      setDataStatus("logic.js와 data/area-guide.json 연결을 기다리고 있어요.", "error");
      return;
    }
    setDataStatus("선택한 조건의 추천 면적을 계산하고 있어요.");
    Promise.resolve(logicApi.recommendArea(state.rooms, state.baths)).then(function (result) {
      var guide;
      var area;
      var pyeong;
      var pieces;
      if (requestId !== recommendationRequestId) return;
      guide = matchingGuide(state.rooms, state.baths);
      area = result && Number(result.area);
      pyeong = result && Number(result.pyeong);
      if (!result || !Number.isFinite(area) || !Number.isFinite(pyeong) || typeof result.label !== "string") throw new Error("추천 면적 반환값이 규격과 다릅니다.");
      if (!guide || !guide.pieces) throw new Error("선택한 조건의 공간 크기 데이터가 없습니다.");
      pieces = piecesFromGuide(guide);
      configureBoard(area, pieces, guide);
      state.recommendation = result;
      state.guide = guide;
      renderRecommendation(result, guide);
      renderPieceList();
      goStep2.disabled = false;
      setDataStatus("추천 면적과 공간 크기를 불러왔어요.", "ready");
    }).catch(function (error) {
      if (requestId !== recommendationRequestId) return;
      showUnavailable(error && error.message ? error.message : "추천 데이터를 불러오지 못했어요.");
      setDataStatus("선택한 조건의 데이터를 불러오지 못했어요.", "error");
    });
  }

  function loadData() {
    Promise.all([
      import("./logic.js"),
      fetch("./data/area-guide.json").then(function (response) {
        if (!response.ok) throw new Error("면적 가이드 응답 오류");
        return response.json();
      })
    ]).then(function (loaded) {
      var module = loaded[0];
      var guideData = loaded[1];
      if (typeof module.recommendArea !== "function") throw new Error("recommendArea 함수가 없습니다.");
      if (typeof module.toRects !== "function" || typeof module.matchPlans !== "function") throw new Error("평면도 비교 함수가 없습니다.");
      if (typeof module.needPerMonth !== "function") throw new Error("목표 기간 계산 함수가 없습니다.");
      logicApi = { recommendArea: module.recommendArea, findSimilar: module.findSimilar, toRects: module.toRects, matchPlans: module.matchPlans, needPerMonth: module.needPerMonth };
      areaGuides = Array.isArray(guideData) ? guideData : Array.isArray(guideData.items) ? guideData.items : [];
      if (!areaGuides.length) throw new Error("면적 가이드가 비어 있습니다.");
      updateRecommendation();
    }).catch(function () {
      showUnavailable("혜성의 추천 로직과 면적 가이드가 연결되면 이곳에 실제 근거가 있는 값이 표시됩니다.");
      setDataStatus("추천 로직 또는 면적 가이드가 아직 준비되지 않았어요.", "error");
    });
  }

  function layoutTray() {
    var trayX = 0;
    var trayY = 0;
    var rowHeight = 0;
    var maxWidth = Math.max(state.cols, 28);
    state.pieces.forEach(function (piece) {
      if (piece.x !== null) return;
      if (trayX + piece.w > maxWidth) {
        trayX = 0;
        trayY += rowHeight + 1;
        rowHeight = 0;
      }
      piece.tx = trayX;
      piece.ty = trayY;
      trayX += piece.w + 1;
      rowHeight = Math.max(rowHeight, piece.h);
    });
    state.trayRows = trayY + rowHeight;
  }

  function overlaps(index, x, y, width, height) {
    return state.pieces.some(function (piece, otherIndex) {
      return otherIndex !== index && piece.x !== null && x < piece.x + piece.w && piece.x < x + width && y < piece.y + piece.h && piece.y < y + height;
    });
  }

  function drawBoard() {
    var width;
    var height;
    var originX = MARGIN;
    var originY = MARGIN;
    var trayY;
    var markup = "";
    var column;
    var row;
    if (!state.pieces.length) return;
    layoutTray();
    width = Math.max(state.cols, 28) + MARGIN * 2;
    height = state.rows + MARGIN * 2 + 3 + state.trayRows + 1;
    trayY = originY + state.rows + 3;
    board.setAttribute("viewBox", "0 0 " + (width * PX) + " " + (height * PX));
    markup += '<rect x="' + (originX * PX) + '" y="' + (originY * PX) + '" width="' + (state.cols * PX) + '" height="' + (state.rows * PX) + '" fill="var(--hall)"/>';
    for (column = 0; column <= state.cols; column += 1) markup += '<line x1="' + ((originX + column) * PX) + '" y1="' + (originY * PX) + '" x2="' + ((originX + column) * PX) + '" y2="' + ((originY + state.rows) * PX) + '" stroke="var(--grid)"/>';
    for (row = 0; row <= state.rows; row += 1) markup += '<line x1="' + (originX * PX) + '" y1="' + ((originY + row) * PX) + '" x2="' + ((originX + state.cols) * PX) + '" y2="' + ((originY + row) * PX) + '" stroke="var(--grid)"/>';
    markup += '<rect x="' + (originX * PX) + '" y="' + (originY * PX) + '" width="' + (state.cols * PX) + '" height="' + (state.rows * PX) + '" fill="none" stroke="var(--ink)" stroke-width="5"/>';
    markup += '<text class="mono" x="' + ((originX + state.cols / 2) * PX) + '" y="' + ((originY - .6) * PX) + '" text-anchor="middle" font-size="12">북쪽</text>';
    markup += '<text class="mono" x="' + ((originX + state.cols / 2) * PX) + '" y="' + ((originY + state.rows + 1.2) * PX) + '" text-anchor="middle" font-size="12">남쪽 · 해가 드는 쪽</text>';
    markup += '<text class="mono" x="' + (originX * PX) + '" y="' + ((trayY - .5) * PX) + '" font-size="12">대기실 · 공간 조각을 집 안으로 끌어 보세요</text>';
    state.pieces.forEach(function (piece, index) {
      var pieceX = piece.x !== null ? originX + piece.x : originX + piece.tx;
      var pieceY = piece.y !== null ? originY + piece.y : trayY + piece.ty;
      var fontSize = Math.min(15, Math.max(10, piece.w * 3));
      var selected = state.selected === index ? " selected" : "";
      var handles = "";
      if (piece.x !== null) {
        handles = '<rect class="resize-edge ns" data-side="top" x="7" y="-8" width="' + (piece.w * PX - 14) + '" height="16"/>'
          + '<rect class="resize-edge ns" data-side="bottom" x="7" y="' + (piece.h * PX - 8) + '" width="' + (piece.w * PX - 14) + '" height="16"/>'
          + '<rect class="resize-edge ew" data-side="left" x="-8" y="7" width="16" height="' + (piece.h * PX - 14) + '"/>'
          + '<rect class="resize-edge ew" data-side="right" x="' + (piece.w * PX - 8) + '" y="7" width="16" height="' + (piece.h * PX - 14) + '"/>';
      }
      markup += '<g class="piece' + selected + '" data-index="' + index + '" transform="translate(' + (pieceX * PX) + ' ' + (pieceY * PX) + ')">'
        + '<rect class="piece-shape" width="' + (piece.w * PX) + '" height="' + (piece.h * PX) + '" fill="var(' + COLORS[piece.id] + ')" stroke="var(--ink)" stroke-width="2"/>'
        + '<text x="' + (piece.w * PX / 2) + '" y="' + (piece.h * PX / 2 - 2) + '" text-anchor="middle" font-size="' + fontSize + '" font-weight="700">' + NAMES[piece.id] + '</text>'
        + '<text class="mono" x="' + (piece.w * PX / 2) + '" y="' + (piece.h * PX / 2 + fontSize) + '" text-anchor="middle" font-size="' + Math.max(9, fontSize - 4) + '">' + (piece.w * CELL).toFixed(1) + '×' + (piece.h * CELL).toFixed(1) + 'm</text>'
        + handles + '</g>';
    });
    board.innerHTML = markup;
    Array.prototype.forEach.call(board.querySelectorAll(".piece"), function (element) { element.addEventListener("pointerdown", startDrag); });
    Array.prototype.forEach.call(board.querySelectorAll(".resize-edge"), function (element) { element.addEventListener("pointerdown", startResize); });
    updateToolState();
    runChecks();
  }

  function updateToolState() {
    var piece = state.selected === null ? null : state.pieces[state.selected];
    resetSizeButton.disabled = !piece;
    selectionStatus.textContent = piece ? NAMES[piece.id] + " 선택됨 · " + (piece.w * CELL).toFixed(1) + " × " + (piece.h * CELL).toFixed(1) + "m" : "조각을 선택해 주세요.";
  }

  function svgPoint(event) {
    var point = board.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(board.getScreenCTM().inverse());
  }

  function startDrag(event) {
    var element = event.currentTarget;
    var index = Number(element.dataset.index);
    var point = svgPoint(event);
    var matrix = element.transform.baseVal.consolidate().matrix;
    state.selected = index;
    drag = { element: element, index: index, dx: point.x - matrix.e, dy: point.y - matrix.f };
    element.classList.add("dragging", "selected");
    element.parentNode.append(element);
    element.setPointerCapture(event.pointerId);
    element.addEventListener("pointermove", moveDrag);
    element.addEventListener("pointerup", endDrag);
    element.addEventListener("pointercancel", endDrag);
    updateToolState();
  }

  function moveDrag(event) {
    var point;
    if (!drag) return;
    point = svgPoint(event);
    drag.element.setAttribute("transform", "translate(" + (point.x - drag.dx) + " " + (point.y - drag.dy) + ")");
  }

  function endDrag(event) {
    var active = drag;
    var matrix;
    var piece;
    var gridX;
    var gridY;
    var moved = false;
    if (!active) return;
    drag = null;
    active.element.removeEventListener("pointermove", moveDrag);
    active.element.removeEventListener("pointerup", endDrag);
    active.element.removeEventListener("pointercancel", endDrag);
    matrix = active.element.transform.baseVal.consolidate().matrix;
    piece = state.pieces[active.index];
    gridX = Math.round(matrix.e / PX) - MARGIN;
    gridY = Math.round(matrix.f / PX) - MARGIN;
    if (gridX >= 0 && gridY >= 0 && gridX + piece.w <= state.cols && gridY + piece.h <= state.rows && !overlaps(active.index, gridX, gridY, piece.w, piece.h)) {
      piece.x = gridX;
      piece.y = gridY;
      moved = true;
    } else if (matrix.f / PX > MARGIN + state.rows + 1) {
      piece.x = null;
      piece.y = null;
      moved = true;
    }
    drawBoard();
    selectionStatus.textContent = moved ? NAMES[piece.id] + " 위치를 0.5m 격자에 맞췄어요." : "놓을 수 없는 위치라 이전 자리로 돌아갔어요.";
  }

  function startResize(event) {
    var group;
    var index;
    var piece;
    event.stopPropagation();
    group = event.currentTarget.parentNode;
    index = Number(group.dataset.index);
    piece = state.pieces[index];
    state.selected = index;
    resize = { group: group, index: index, side: event.currentTarget.dataset.side, x: piece.x, y: piece.y, w: piece.w, h: piece.h };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.addEventListener("pointermove", moveResize);
    event.currentTarget.addEventListener("pointerup", endResize);
    event.currentTarget.addEventListener("pointercancel", endResize);
    updateToolState();
  }

  function moveResize(event) {
    var piece;
    var point;
    var gridX;
    var gridY;
    var x;
    var y;
    var width;
    var height;
    var next;
    var valid;
    if (!resize) return;
    piece = state.pieces[resize.index];
    point = svgPoint(event);
    gridX = Math.round(point.x / PX) - MARGIN;
    gridY = Math.round(point.y / PX) - MARGIN;
    x = piece.x;
    y = piece.y;
    width = piece.w;
    height = piece.h;
    if (resize.side === "right") width = Math.max(2, gridX - piece.x);
    if (resize.side === "bottom") height = Math.max(2, gridY - piece.y);
    if (resize.side === "left") {
      next = Math.min(gridX, piece.x + piece.w - 2);
      width = piece.x + piece.w - next;
      x = next;
    }
    if (resize.side === "top") {
      next = Math.min(gridY, piece.y + piece.h - 2);
      height = piece.y + piece.h - next;
      y = next;
    }
    Object.assign(resize, { x: x, y: y, w: width, h: height });
    valid = x >= 0 && y >= 0 && x + width <= state.cols && y + height <= state.rows && !overlaps(resize.index, x, y, width, height);
    resize.group.setAttribute("transform", "translate(" + ((MARGIN + x) * PX) + " " + ((MARGIN + y) * PX) + ")");
    resize.group.querySelector(".piece-shape").setAttribute("width", width * PX);
    resize.group.querySelector(".piece-shape").setAttribute("height", height * PX);
    resize.group.classList.toggle("bad", !valid);
  }

  function endResize(event) {
    var active = resize;
    var piece;
    var valid;
    if (!active) return;
    resize = null;
    event.currentTarget.removeEventListener("pointermove", moveResize);
    event.currentTarget.removeEventListener("pointerup", endResize);
    event.currentTarget.removeEventListener("pointercancel", endResize);
    piece = state.pieces[active.index];
    valid = active.x >= 0 && active.y >= 0 && active.x + active.w <= state.cols && active.y + active.h <= state.rows && !overlaps(active.index, active.x, active.y, active.w, active.h);
    if (valid) Object.assign(piece, { x: active.x, y: active.y, w: active.w, h: active.h });
    renderPieceList();
    drawBoard();
    selectionStatus.textContent = valid ? NAMES[piece.id] + " 크기를 0.5m 단위로 바꿨어요." : "겹치거나 집 밖으로 나가 크기를 바꾸지 않았어요.";
  }

  function fits(index, x, y, width, height) {
    return x === null || x >= 0 && y >= 0 && x + width <= state.cols && y + height <= state.rows && !overlaps(index, x, y, width, height);
  }

  function resetSelectedSize() {
    var piece = state.pieces[state.selected];
    var message;
    if (!piece) return;
    if (fits(state.selected, piece.x, piece.y, piece.w0, piece.h0)) {
      piece.w = piece.w0;
      piece.h = piece.h0;
      message = NAMES[piece.id] + " 크기를 원래대로 복원했어요.";
    } else if (fits(state.selected, piece.x, piece.y, piece.h0, piece.w0)) {
      piece.w = piece.h0;
      piece.h = piece.w0;
      message = NAMES[piece.id] + " 크기를 회전된 원래 크기로 복원했어요.";
    } else {
      message = "현재 자리에서는 원래 크기로 복원할 수 없어요.";
    }
    renderPieceList();
    drawBoard();
    selectionStatus.textContent = message;
  }

  function clearBoard() {
    // 위치와 함께 크기도 평수 기준 원래 크기로 되돌린다
    state.pieces.forEach(function (piece) { piece.x = null; piece.y = null; piece.w = piece.w0; piece.h = piece.h0; });
    state.selected = null;
    renderPieceList();
    drawBoard();
    selectionStatus.textContent = "모든 조각을 원래 크기로 대기실에 돌려놨어요.";
  }

  function tryPlace(index, preferredY) {
    var piece = state.pieces[index];
    var y;
    var x;
    var firstY = preferredY === null ? 0 : preferredY;
    var lastY = preferredY === null ? state.rows - piece.h : preferredY;
    for (y = firstY; y <= lastY; y += 1) {
      for (x = 0; x + piece.w <= state.cols; x += 1) {
        if (!overlaps(index, x, y, piece.w, piece.h)) {
          piece.x = x;
          piece.y = y;
          return true;
        }
      }
    }
    return false;
  }

  // 예시 배치: 남쪽 줄에 방2·거실·안방(방1), 안방 욕실(욕실2)은 안방 바로 위에 붙이고
  // 북쪽 줄에 방3·공용 욕실(욕실1)·주방·현관을 왼쪽부터 둔다. 두 욕실이 붙지 않게 한다.
  function autoPlace() {
    var get = function (id) { return state.pieces.find(function (piece) { return piece.id === id; }); };
    var put = function (piece, x, y) {
      if (!piece || x < 0 || y < 0 || x + piece.w > state.cols || y + piece.h > state.rows) return false;
      if (overlaps(state.pieces.indexOf(piece), x, y, piece.w, piece.h)) return false;
      piece.x = x; piece.y = y; return true;
    };
    var cursor = 0;
    var master;
    var masterBath;
    state.pieces.forEach(function (piece) { piece.x = null; piece.y = null; piece.w = piece.w0; piece.h = piece.h0; });
    ["room2", "living", "room1"].map(get).filter(Boolean).forEach(function (piece) {
      if (put(piece, cursor, state.rows - piece.h)) cursor += piece.w;
    });
    master = get("room1");
    masterBath = get("bath2");
    if (master && masterBath && master.x !== null) {
      if (!put(masterBath, master.x + master.w - masterBath.w, master.y - masterBath.h)) put(masterBath, master.x, master.y - masterBath.h);
    }
    cursor = 0;
    ["room3", "bath1", "kitchen", "entry"].map(get).filter(Boolean).forEach(function (piece) {
      // 집이 작으면 북쪽 줄 조각의 세로를 최대 두 칸까지 줄여서 넣는다 ("원래 크기로"로 복귀 가능)
      var originalHeight = piece.h;
      var height;
      var x;
      for (height = originalHeight; height >= Math.max(2, originalHeight - 2) && piece.x === null; height -= 1) {
        piece.h = height;
        for (x = cursor; x + piece.w <= state.cols; x += 1) {
          if (put(piece, x, 0)) { cursor = x + piece.w; break; }
        }
      }
      if (piece.x === null) piece.h = originalHeight;
    });
    // 줄에 못 들어간 조각은 기존 방식대로 빈자리를 찾는다 (돌려서라도)
    state.pieces.forEach(function (piece, index) {
      if (piece.x !== null || tryPlace(index, null)) return;
      piece.w = piece.h0;
      piece.h = piece.w0;
      if (!tryPlace(index, null)) {
        piece.w = piece.w0;
        piece.h = piece.h0;
      }
    });
    state.selected = null;
    renderPieceList();
    drawBoard();
    selectionStatus.textContent = state.baths === 2 ? "안방 욕실은 안방 옆에, 공용 욕실은 복도 쪽에 둔 예시 배치예요." : "공용 욕실을 복도 쪽에 둔 예시 배치예요.";
  }

  function addCheck(message, status) {
    var item = document.createElement("li");
    item.textContent = message;
    item.className = status === "ok" ? "is-ok" : status === "pending" ? "is-pending" : "";
    checkList.append(item);
  }

  function runChecks() {
    var placed = state.pieces.filter(function (piece) { return piece.x !== null; });
    var left = state.pieces.length - placed.length;
    var owner = [];
    var living;
    var entry;
    var row;
    var column;
    checkList.replaceChildren();
    if (left) addCheck("아직 대기실에 " + left + "개 공간이 남아 있어요.", "pending");
    for (row = 0; row < state.rows; row += 1) owner.push(Array(state.cols).fill(null));
    placed.forEach(function (piece) {
      var y;
      var x;
      for (y = piece.y; y < piece.y + piece.h; y += 1) {
        for (x = piece.x; x < piece.x + piece.w; x += 1) owner[y][x] = piece.id;
      }
    });
    living = state.pieces.find(function (piece) { return piece.id === "living"; });
    if (living && living.x !== null) {
      if (living.y + living.h === state.rows) addCheck("거실이 남쪽 외벽에 닿아 있어요.", "ok");
      else addCheck("거실이 남쪽 외벽에 닿지 않았어요. 아래쪽으로 옮겨 보세요.");
    } else {
      addCheck("거실을 배치하면 남쪽 외벽 인접 여부를 확인할 수 있어요.", "pending");
    }
    entry = state.pieces.find(function (piece) { return piece.id === "entry"; });
    if (entry && entry.x !== null && !left) {
      var seen = new Set();
      var reached = new Set(["entry"]);
      var queue = [];
      var cursor = 0;
      var directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      var stuck;
      for (row = entry.y; row < entry.y + entry.h; row += 1) {
        for (column = entry.x; column < entry.x + entry.w; column += 1) {
          queue.push([column, row]);
          seen.add(column + "," + row);
        }
      }
      while (cursor < queue.length) {
        var current = queue[cursor];
        cursor += 1;
        directions.forEach(function (direction) {
          var nextX = current[0] + direction[0];
          var nextY = current[1] + direction[1];
          var id;
          var key;
          var passable;
          if (nextX < 0 || nextY < 0 || nextX >= state.cols || nextY >= state.rows) return;
          id = owner[nextY][nextX];
          if (id) reached.add(id);
          key = nextX + "," + nextY;
          passable = id === null || id === "living" || id === "kitchen" || id === "entry";
          if (!seen.has(key) && passable) {
            seen.add(key);
            queue.push([nextX, nextY]);
          }
        });
      }
      stuck = placed.filter(function (piece) { return !reached.has(piece.id); }).map(function (piece) { return NAMES[piece.id]; });
      if (stuck.length) addCheck(stuck.join(", ") + "에 이어지는 길이 없어요. 빈칸·거실·주방에 닿게 옮겨 보세요.");
      else addCheck("격자 기준으로 현관에서 모든 공간에 이어지는 길이 있어요.", "ok");
      var emptyCells = 0;
      owner.forEach(function (cells) { cells.forEach(function (value) { if (value === null) emptyCells += 1; }); });
      addCheck("복도·벽으로 남은 공간은 " + (emptyCells * CELL * CELL).toFixed(1) + "㎡예요.", "ok");
    } else {
      addCheck("모든 공간을 배치하면 현관에서 각 공간까지의 연결을 확인해요.", "pending");
    }
  }

  function formatPrice(value) {
    var price = Number(value);
    var eok;
    var remainder;
    if (!Number.isFinite(price) || price <= 0) return "정보 없음";
    eok = Math.floor(price / 10000);
    remainder = Math.round(price % 10000);
    if (eok && remainder) return eok + "억 " + remainder.toLocaleString("ko-KR") + "만원";
    if (eok) return eok + "억원";
    return remainder.toLocaleString("ko-KR") + "만원";
  }

  function svgNode(name, attributes) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, String(attributes[key])); });
    return node;
  }

  function createPlanSvg(rects, overlayRects, label) {
    var width = 240;
    var height = 120;
    var svg = svgNode("svg", { viewBox: "0 0 " + width + " " + height, role: "img", "aria-label": label || "평면도", class: "plan-svg" });
    svg.append(svgNode("rect", { x: 1, y: 1, width: width - 2, height: height - 2, fill: "var(--hall)", stroke: "var(--ink)", "stroke-width": 2 }));
    (Array.isArray(rects) ? rects : []).forEach(function (rect) {
      var x = Number(rect.x);
      var y = Number(rect.y);
      var w = Number(rect.w);
      var h = Number(rect.h);
      var shape;
      var text;
      if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return;
      shape = svgNode("rect", { x: x * width, y: y * height, width: w * width, height: h * height, fill: "var(" + (PLAN_COLORS[rect.t] || "--hall") + ")", stroke: "var(--ink)", "stroke-width": 1 });
      svg.append(shape);
      if (w * width > 24 && h * height > 14) {
        text = svgNode("text", { x: (x + w / 2) * width, y: (y + h / 2) * height + 4, "text-anchor": "middle", "font-size": 9, fill: "var(--ink)" });
        text.textContent = rect.n || PLAN_NAMES[rect.t] || rect.t;
        svg.append(text);
      }
    });
    (Array.isArray(overlayRects) ? overlayRects : []).forEach(function (rect) {
      var x = Number(rect.x);
      var y = Number(rect.y);
      var w = Number(rect.w);
      var h = Number(rect.h);
      if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return;
      svg.append(svgNode("rect", { x: x * width, y: y * height, width: w * width, height: h * height, fill: "none", stroke: "var(--warn)", "stroke-width": 2, "stroke-dasharray": "5 3" }));
    });
    return svg;
  }

  function updateViewMode() {
    Array.prototype.forEach.call(viewMode.querySelectorAll("button"), function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.view === state.viewMode));
    });
  }

  function updatePlanScope() {
    Array.prototype.forEach.call(planScope.querySelectorAll("button"), function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.scope === state.planScope));
    });
  }

  function createSourceLink(plan) {
    var url;
    var link;
    try {
      url = new URL(String(plan.source || ""));
    } catch (error) {
      return null;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    link = document.createElement("a");
    link.className = "plan-source-link";
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "원본 평면도 페이지 열기 (" + String(plan.sourceName || "출처") + ")";
    return link;
  }

  function renderPlanMatches() {
    planMatchList.replaceChildren();
    updateViewMode();
    updatePlanScope();
    state.matches.forEach(function (match, index) {
      var plan = match.plan || {};
      var trade = match.trade;
      var card = document.createElement("article");
      var head = document.createElement("div");
      var titleWrap = document.createElement("div");
      var title = document.createElement("h3");
      var meta = document.createElement("p");
      var score = document.createElement("strong");
      var pair = document.createElement("div");
      var parts = document.createElement("ul");
      var button = document.createElement("button");
      var mineFigure = document.createElement("figure");
      var planFigure = document.createElement("figure");
      var tradeCopy = document.createElement("p");
      var sourceLink = createSourceLink(plan);
      var caption;
      card.className = "plan-match-card" + (state.selectedMatch === match ? " is-selected" : "");
      head.className = "plan-match-head";
      title.textContent = (index + 1) + "위 · " + String(plan.apt || "실제 평면도") + " " + String(plan.type || "");
      meta.textContent = String(plan.region || "지역 정보 없음") + " · 전용 " + String(plan.area || "-") + "㎡ · 방 " + String(plan.rooms || "-") + " · 욕실 " + String(plan.baths || "-");
      score.className = "match-score";
      score.textContent = String(Number(match.score) || 0) + "%";
      titleWrap.append(title, meta);
      head.append(titleWrap, score);
      pair.className = "plan-pair" + (state.viewMode === "overlay" ? " is-overlay" : "");
      if (state.viewMode === "overlay") {
        planFigure.append(createPlanSvg(plan.rects, state.mineRects, "실제 평면도 위에 내 도면을 겹친 비교"));
        caption = document.createElement("figcaption");
        caption.textContent = "색칠: 실제 평면도 · 주황 점선: 내 도면";
        planFigure.append(caption);
        pair.append(planFigure);
      } else {
        mineFigure.append(createPlanSvg(state.mineRects, null, "내가 만든 평면도"));
        caption = document.createElement("figcaption");
        caption.textContent = "내 도면";
        mineFigure.append(caption);
        planFigure.append(createPlanSvg(plan.rects, null, "실제 평면도"));
        caption = document.createElement("figcaption");
        caption.textContent = String(plan.apt || "실제 평면도") + " " + String(plan.type || "");
        planFigure.append(caption);
        pair.append(mineFigure, planFigure);
      }
      parts.className = "match-parts";
      (Array.isArray(match.parts) ? match.parts : []).forEach(function (part) {
        var item = document.createElement("li");
        item.className = part.same ? "is-same" : "";
        item.textContent = String(part.name || PLAN_NAMES[part.t] || part.t) + (part.same ? " 위치 비슷함" : " 위치 다름");
        parts.append(item);
      });
      tradeCopy.className = "match-trade";
      if (trade) {
        tradeCopy.textContent = "단지 실거래 · 최근 매매 " + formatPrice(trade.lastSale) + (trade.saleDate ? " (" + String(trade.saleDate) + ")" : "") + " · 1년 중앙값 " + formatPrice(trade.sale) + " · 전세 " + formatPrice(trade.jeonse);
      } else {
        tradeCopy.textContent = "연결된 단지 거래 정보가 없습니다. 견적서는 선택 지역·면적의 매매 중앙값을 사용합니다.";
      }
      button.type = "button";
      button.className = "secondary-button";
      button.setAttribute("aria-pressed", String(state.selectedMatch === match));
      button.textContent = state.selectedMatch === match ? "시세 비교 기준으로 선택됨" : "이 평면도 크기로 시세 찾기";
      button.addEventListener("click", function () { selectMatch(match); });
      card.append(head, pair, parts, tradeCopy);
      if (sourceLink) card.append(sourceLink);
      card.append(button);
      planMatchList.append(card);
    });
  }

  function selectMatch(match) {
    state.selectedMatch = match;
    state.selectedApartment = null;
    state.estimate = null;
    state.quotePrice = null;
    state.quoteSource = "";
    renderPlanMatches();
    planSource.textContent = "도면 출처: " + String(match.plan.sourceName || "출처 정보 없음") + ". 일치율은 같은 공간의 겹침과 중심 위치를 함께 비교한 참고값입니다.";
    loadSimilar();
  }

  function runPlanMatching() {
    var requestId = ++matchRequestId;
    var placed = state.pieces.filter(function (piece) { return piece.x !== null; });
    var mine;
    state.matches = [];
    state.selectedMatch = null;
    state.similar = null;
    state.selectedApartment = null;
    state.quotePrice = null;
    state.quoteSource = "";
    planMatchList.replaceChildren();
    apartmentList.replaceChildren();
    marketSummary.hidden = true;
    goStep4.disabled = true;
    if (!logicApi || typeof logicApi.toRects !== "function" || typeof logicApi.matchPlans !== "function") {
      matchStatus.textContent = "평면도 비교 로직을 불러오지 못했어요.";
      matchStatus.dataset.state = "error";
      return;
    }
    if (!state.pieces.length || placed.length !== state.pieces.length) {
      matchStatus.textContent = "모든 공간을 집 안에 배치한 뒤 비교해 주세요.";
      matchStatus.dataset.state = "error";
      similarStatus.textContent = "실제 평면도를 선택하면 대전 실거래가를 찾아요.";
      return;
    }
    try {
      mine = logicApi.toRects(state.pieces, state.cols, state.rows);
    } catch (error) {
      matchStatus.textContent = error && error.message ? error.message : "내 평면도를 변환하지 못했어요.";
      matchStatus.dataset.state = "error";
      return;
    }
    if (!Array.isArray(mine) || !mine.length) {
      matchStatus.textContent = "비교할 수 있는 공간이 없어요.";
      matchStatus.dataset.state = "error";
      return;
    }
    state.mineRects = mine;
    matchStatus.textContent = (state.planScope === "daejeon" ? "대전 아파트" : "전체") + " 평면도와 배치를 비교하고 있어요.";
    matchStatus.dataset.state = "";
    Promise.resolve(logicApi.matchPlans(mine, { area: Number(state.recommendation.area), rooms: state.rooms, limit: 3, daejeonOnly: state.planScope === "daejeon" })).then(function (matches) {
      if (requestId !== matchRequestId) return;
      if (!Array.isArray(matches)) throw new Error("평면도 비교 반환값이 규격과 다릅니다.");
      state.matches = matches.filter(function (match) { return match && match.plan && Array.isArray(match.plan.rects); }).slice(0, 3);
      if (!state.matches.length) throw new Error("조건에 맞는 실제 평면도를 찾지 못했어요.");
      state.selectedMatch = state.matches[0];
      renderPlanMatches();
      planSource.textContent = "도면 출처: " + String(state.selectedMatch.plan.sourceName || "출처 정보 없음") + ". 일치율은 같은 공간의 겹침과 중심 위치를 함께 비교한 참고값입니다.";
      matchStatus.textContent = (state.planScope === "daejeon" ? "대전 아파트에서 " : "전체 43개 도면에서 ") + "가장 닮은 " + state.matches.length + "개를 찾았어요.";
      matchStatus.dataset.state = "ready";
      loadSimilar();
    }).catch(function (error) {
      if (requestId !== matchRequestId) return;
      matchStatus.textContent = error && error.message ? error.message : "실제 평면도를 비교하지 못했어요.";
      matchStatus.dataset.state = "error";
    });
  }

  function renderDistrictControl() {
    districtControl.replaceChildren();
    ["동구", "중구", "서구", "유성구", "대덕구"].forEach(function (gu) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = gu;
      button.setAttribute("aria-pressed", String(gu === state.gu));
      button.addEventListener("click", function () {
        state.gu = gu;
        renderDistrictControl();
        loadSimilar();
      });
      districtControl.append(button);
    });
  }

  function setSimilarStatus(message, status) {
    similarStatus.textContent = message;
    similarStatus.dataset.state = status || "";
  }

  function renderMarketSummary(result) {
    var summary = result.summary || {};
    var count = Number(summary.count);
    var area = state.selectedMatch && state.selectedMatch.plan ? Number(state.selectedMatch.plan.area) : NaN;
    summaryCount.textContent = (Number.isFinite(count) ? count : result.items.length) + "곳";
    summarySale.textContent = formatPrice(summary.medianSale);
    summaryJeonse.textContent = formatPrice(summary.medianJeonse);
    marketSummary.hidden = false;
    apartmentSource.textContent = "비교 기준: " + (Number.isFinite(area) ? "선택한 실제 평면도 전용면적 " + area + "㎡ ±5㎡" : "선택한 실제 평면도 전용면적 ±5㎡") + " · " + state.gu + ". " + (summary.period ? "거래 기간 " + String(summary.period) + ". " : "") + "출처: " + String(summary.source || "국토교통부 아파트 매매·전월세 실거래가 공개 API") + ".";
  }

  function resolveQuote() {
    var match = state.selectedMatch;
    var trade = match && match.trade;
    var tradePrice = trade && Number(trade.lastSale);
    var summary = state.similar && state.similar.summary;
    var medianPrice = summary && Number(summary.medianSale);
    var area = match && match.plan && Number(match.plan.area);
    if (Number.isFinite(tradePrice) && tradePrice > 0) {
      return {
        price: tradePrice,
        label: "단지 최근 실거래가",
        title: String(trade.apt || match.plan.apt || "선택한 단지"),
        meta: String(trade.gu || "") + (trade.dong ? " " + String(trade.dong) : "") + " · 전용 " + String(trade.area || area || "-") + "㎡" + (trade.saleDate ? " · " + String(trade.saleDate) + " 거래" : ""),
        source: "선택한 평면도와 연결된 단지 최근 실거래가"
      };
    }
    if (Number.isFinite(medianPrice) && medianPrice > 0) {
      return {
        price: medianPrice,
        label: "지역·면적 기준 매매 중앙값",
        title: state.gu + " 비슷한 면적 아파트",
        meta: "전용 " + String(area || "-") + "㎡ ±5㎡" + (summary.period ? " · " + String(summary.period) : ""),
        source: state.gu + " 전용 " + String(area || "-") + "㎡ ±5㎡ 매매 중앙값"
      };
    }
    return null;
  }

  function updateQuoteAvailability() {
    var quote = resolveQuote();
    state.quotePrice = quote ? quote.price : null;
    state.quoteSource = quote ? quote.source : "";
    goStep4.disabled = !quote;
  }

  function apartmentPrice(item) {
    var recent = item && Number(item.lastSale);
    var fallback = item && Number(item.sale);
    return Number.isFinite(recent) && recent > 0 ? recent : fallback;
  }

  function apartmentMeta(item) {
    var parts = [];
    var area = Number(item.area);
    if (item.dong) parts.push(String(item.dong));
    if (Number.isFinite(area)) parts.push("전용 " + area.toFixed(1) + "㎡");
    if (item.built) parts.push(String(item.built) + "년 준공");
    return parts.join(" · ") || "상세 정보 없음";
  }

  function selectApartment(item) {
    state.selectedApartment = item;
    state.estimate = null;
    saveEstimateButton.disabled = true;
    renderApartmentList(state.similar.items);
  }

  function renderApartmentList(items) {
    apartmentList.replaceChildren();
    items.forEach(function (item) {
      var listItem = document.createElement("li");
      var card = document.createElement("article");
      var heading = document.createElement("h3");
      var meta = document.createElement("p");
      var prices = document.createElement("div");
      var sale = document.createElement("div");
      var saleLabel = document.createElement("span");
      var saleValue = document.createElement("strong");
      var jeonse = document.createElement("div");
      var jeonseLabel = document.createElement("span");
      var jeonseValue = document.createElement("strong");
      var button = document.createElement("button");
      var salePrice = apartmentPrice(item);
      card.className = "apartment-card" + (state.selectedApartment === item ? " is-selected" : "");
      heading.textContent = item.apt ? String(item.apt) : "단지명 정보 없음";
      meta.className = "apartment-meta";
      meta.textContent = apartmentMeta(item) + (item.saleDate ? " · 매매 " + String(item.saleDate) + " 기준" : "");
      prices.className = "price-grid";
      saleLabel.textContent = "최근 매매가";
      saleValue.textContent = formatPrice(salePrice);
      jeonseLabel.textContent = "최근 전세가";
      jeonseValue.textContent = formatPrice(item.jeonse);
      sale.append(saleLabel, saleValue);
      jeonse.append(jeonseLabel, jeonseValue);
      prices.append(sale, jeonse);
      button.type = "button";
      button.className = "secondary-button";
      button.disabled = !Number.isFinite(salePrice) || salePrice <= 0;
      button.setAttribute("aria-pressed", String(state.selectedApartment === item));
      button.textContent = button.disabled ? "매매가 정보 없음" : state.selectedApartment === item ? "선택됨" : "이 아파트 선택";
      button.addEventListener("click", function () { selectApartment(item); });
      card.append(heading, meta, prices, button);
      listItem.append(card);
      apartmentList.append(listItem);
    });
  }

  function loadSimilar() {
    var requestId = ++similarRequestId;
    var area = state.selectedMatch && state.selectedMatch.plan && Number(state.selectedMatch.plan.area);
    state.similar = null;
    state.selectedApartment = null;
    state.estimate = null;
    marketSummary.hidden = true;
    apartmentList.replaceChildren();
    goStep4.disabled = true;
    if (!Number.isFinite(area)) {
      setSimilarStatus("실제 평면도를 선택하면 대전 실거래가를 찾아요.", "error");
      return;
    }
    if (!logicApi || typeof logicApi.findSimilar !== "function") {
      setSimilarStatus("아파트 검색 로직과 실거래 데이터를 준비하고 있어요.", "error");
      updateQuoteAvailability();
      return;
    }
    setSimilarStatus(state.gu + "의 전용면적 " + area + "㎡ ±5㎡ 아파트를 찾고 있어요.");
    Promise.resolve(logicApi.findSimilar({ area: area, gu: state.gu, limit: 10 })).then(function (result) {
      var items;
      var dates;
      if (requestId !== similarRequestId) return;
      if (!result || !Array.isArray(result.items)) throw new Error("아파트 검색 반환값이 규격과 다릅니다.");
      items = result.items;
      state.similar = { summary: result.summary || {}, items: items };
      renderMarketSummary(state.similar);
      renderApartmentList(items);
      updateQuoteAvailability();
      if (!items.length) {
        setSimilarStatus(state.gu + "에서 조건에 맞는 아파트를 찾지 못했어요.", "error");
        return;
      }
      dates = items.map(function (item) { return item.saleDate ? String(item.saleDate) : ""; }).filter(Boolean).sort();
      setSimilarStatus(items.length + "개 결과를 찾았어요." + (dates.length ? " 최근 매매 " + dates[dates.length - 1] + " 기준입니다." : ""), "ready");
    }).catch(function (error) {
      if (requestId !== similarRequestId) return;
      state.similar = null;
      updateQuoteAvailability();
      setSimilarStatus(error && error.message ? error.message : "아파트 데이터를 불러오지 못했어요.", "error");
    });
  }

  function renderFloorplanPreview() {
    var clone;
    drawBoard();
    clone = board.cloneNode(true);
    clone.removeAttribute("id");
    clone.setAttribute("viewBox", "0 0 " + ((state.cols + MARGIN * 2) * PX) + " " + ((state.rows + MARGIN * 2) * PX));
    clone.setAttribute("aria-label", "내가 만든 집 평면도");
    Array.prototype.forEach.call(clone.querySelectorAll(".piece"), function (element) {
      var piece = state.pieces[Number(element.dataset.index)];
      if (!piece || piece.x === null) {
        element.remove();
        return;
      }
      element.classList.remove("selected", "dragging", "bad");
      Array.prototype.forEach.call(element.querySelectorAll(".resize-edge"), function (edge) { edge.remove(); });
    });
    estimatePlan.replaceChildren(clone);
  }

  function resetEstimateResult(message) {
    state.estimate = null;
    estimateRequestId += 1;
    estimateResultMessage.textContent = message;
    estimateResultDetails.hidden = true;
    saveEstimateButton.disabled = true;
  }

  function renderEstimateStep() {
    var match = state.selectedMatch;
    var quote = resolveQuote();
    var area = match && match.plan && Number(match.plan.area);
    if (!match || !quote) return;
    estimateArea.textContent = Number.isFinite(area) ? "비교형 전용 " + area + "㎡" : "전용면적 정보 없음";
    estimateApartment.textContent = quote.title;
    estimateApartmentMeta.textContent = quote.meta;
    estimatePriceLabel.textContent = quote.label;
    estimatePrice.textContent = formatPrice(quote.price);
    targetYears.value = "";
    state.quotePrice = quote.price;
    state.quoteSource = quote.source;
    renderFloorplanPreview();
    estimateMatchPlan.replaceChildren(createPlanSvg(match.plan.rects, null, "선택한 실제 평면도"));
    estimateMatchMeta.textContent = String(match.plan.apt || "실제 평면도") + " " + String(match.plan.type || "") + " · 일치율 " + String(Number(match.score) || 0) + "% · " + String(match.plan.sourceName || "출처 정보 없음");
    resetEstimateResult("몇 년 안에 사고 싶은지 입력해 주세요.");
  }

  function runEstimate() {
    var requestId;
    var price = Number(state.quotePrice);
    var years = Number(targetYears.value);
    if (!Number.isFinite(years) || years <= 0 || years > 99) {
      resetEstimateResult(targetYears.value ? "목표 기간은 1년부터 99년 사이로 입력해 주세요." : "몇 년 안에 사고 싶은지 입력해 주세요.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      resetEstimateResult("계산에 사용할 실제 가격을 찾지 못했어요.");
      return;
    }
    if (!logicApi || typeof logicApi.needPerMonth !== "function") {
      resetEstimateResult("견적 계산 로직을 불러오지 못했어요.");
      return;
    }
    requestId = ++estimateRequestId;
    estimateResultMessage.textContent = "내 집 마련 기간을 계산하고 있어요.";
    estimateResultDetails.hidden = true;
    saveEstimateButton.disabled = true;
    Promise.resolve(logicApi.needPerMonth({ price: price, years: years })).then(function (result) {
      var perMonth;
      if (requestId !== estimateRequestId) return;
      perMonth = result && Number(result.perMonth);
      if (!result || !Number.isFinite(perMonth) || typeof result.text !== "string") throw new Error("견적 반환값이 규격과 다릅니다.");
      state.estimate = result;
      estimateResultMessage.textContent = result.text;
      estimateMonthly.textContent = formatPrice(perMonth);
      estimateYears.textContent = String(result.years) + "년";
      estimateResultDetails.hidden = false;
      saveEstimateButton.disabled = false;
    }).catch(function (error) {
      if (requestId !== estimateRequestId) return;
      resetEstimateResult(error && error.message ? error.message : "견적을 계산하지 못했어요.");
    });
  }

  function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
    var words = String(text).split(" ");
    var line = "";
    var lineY = y;
    words.forEach(function (word) {
      var testLine = line ? line + " " + word : word;
      if (line && context.measureText(testLine).width > maxWidth) {
        context.fillText(line, x, lineY);
        line = word;
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    });
    if (line) context.fillText(line, x, lineY);
    return lineY;
  }

  function drawExportPlan(context, x, y, width, height) {
    var scale = Math.min(width / state.cols, height / state.rows);
    var planWidth = state.cols * scale;
    var planHeight = state.rows * scale;
    var left = x + (width - planWidth) / 2;
    var top = y + (height - planHeight) / 2;
    var column;
    var row;
    var styles = getComputedStyle(document.documentElement);
    context.fillStyle = styles.getPropertyValue("--hall").trim() || "#fffefc";
    context.fillRect(left, top, planWidth, planHeight);
    context.strokeStyle = "#e5e7eb";
    context.lineWidth = 1;
    for (column = 0; column <= state.cols; column += 1) {
      context.beginPath();
      context.moveTo(left + column * scale, top);
      context.lineTo(left + column * scale, top + planHeight);
      context.stroke();
    }
    for (row = 0; row <= state.rows; row += 1) {
      context.beginPath();
      context.moveTo(left, top + row * scale);
      context.lineTo(left + planWidth, top + row * scale);
      context.stroke();
    }
    state.pieces.forEach(function (piece) {
      var pieceX;
      var pieceY;
      var pieceWidth;
      var pieceHeight;
      if (piece.x === null) return;
      pieceX = left + piece.x * scale;
      pieceY = top + piece.y * scale;
      pieceWidth = piece.w * scale;
      pieceHeight = piece.h * scale;
      context.fillStyle = styles.getPropertyValue(COLORS[piece.id]).trim() || "#dceaf0";
      context.fillRect(pieceX, pieceY, pieceWidth, pieceHeight);
      context.strokeStyle = "#2d3137";
      context.strokeRect(pieceX, pieceY, pieceWidth, pieceHeight);
      context.fillStyle = "#2d3137";
      context.font = "700 18px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(NAMES[piece.id], pieceX + pieceWidth / 2, pieceY + pieceHeight / 2 + 6, Math.max(0, pieceWidth - 8));
    });
    context.strokeStyle = "#2d3137";
    context.lineWidth = 5;
    context.strokeRect(left, top, planWidth, planHeight);
    context.textAlign = "left";
  }

  function drawNormalizedExportPlan(context, rects, x, y, width, height) {
    var styles = getComputedStyle(document.documentElement);
    context.fillStyle = styles.getPropertyValue("--hall").trim() || "#fffefc";
    context.fillRect(x, y, width, height);
    (Array.isArray(rects) ? rects : []).forEach(function (rect) {
      var left = x + Number(rect.x) * width;
      var top = y + Number(rect.y) * height;
      var rectWidth = Number(rect.w) * width;
      var rectHeight = Number(rect.h) * height;
      if (![left, top, rectWidth, rectHeight].every(Number.isFinite) || rectWidth <= 0 || rectHeight <= 0) return;
      context.fillStyle = styles.getPropertyValue(PLAN_COLORS[rect.t] || "--hall").trim() || "#dceaf0";
      context.fillRect(left, top, rectWidth, rectHeight);
      context.strokeStyle = "#2d3137";
      context.lineWidth = 2;
      context.strokeRect(left, top, rectWidth, rectHeight);
    });
    context.strokeStyle = "#2d3137";
    context.lineWidth = 5;
    context.strokeRect(x, y, width, height);
  }

  function saveEstimateImage() {
    var canvas;
    var context;
    var match = state.selectedMatch;
    var years = Number(targetYears.value);
    if (!match || !state.estimate || !Number.isFinite(years) || years <= 0 || !Number.isFinite(Number(state.quotePrice))) return;
    canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1400;
    context = canvas.getContext("2d");
    context.fillStyle = "#fffdf9";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#2d3137";
    context.font = "700 54px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
    context.fillText("나만의 집 마련 견적서", 70, 95);
    context.fillStyle = "#4f7f93";
    context.font = "700 26px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
    context.fillText(estimateArea.textContent, 70, 145);
    context.fillStyle = "#2d3137";
    context.font = "700 25px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
    context.fillText("내 도면", 70, 195);
    context.fillText("선택한 실제 평면도 · " + String(Number(match.score) || 0) + "%", 560, 195);
    drawExportPlan(context, 70, 220, 450, 360);
    drawNormalizedExportPlan(context, match.plan.rects, 560, 220, 450, 360);
    context.fillStyle = "#2d3137";
    context.font = "700 36px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
    wrapCanvasText(context, estimateApartment.textContent, 70, 660, 940, 46);
    context.fillStyle = "#68707a";
    context.font = "24px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
    context.fillText(estimateApartmentMeta.textContent, 70, 715);
    context.fillStyle = "#2d3137";
    context.font = "700 32px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
    context.fillText(estimatePriceLabel.textContent + "  " + estimatePrice.textContent, 70, 780);
    context.fillText("목표 기간  " + String(years) + "년", 70, 835);
    context.fillStyle = "#4f7f93";
    context.font = "700 40px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
    wrapCanvasText(context, state.estimate.text, 70, 925, 940, 52);
    context.fillStyle = "#68707a";
    context.font = "22px \"Pretendard Variable\", Pretendard, system-ui, sans-serif";
    wrapCanvasText(context, "가격 기준: " + state.quoteSource, 70, 1160, 940, 30);
    wrapCanvasText(context, "도면: " + String(match.plan.sourceName || "출처 정보 없음") + " · 시세: 국토교통부 아파트 실거래가 공개 API", 70, 1220, 940, 30);
    wrapCanvasText(context, "집값을 목표 기간의 개월 수로 나눈 단순 비교이며 대출·세금·이자·물가 변동을 반영하지 않습니다.", 70, 1300, 940, 30);
    canvas.toBlob(function (blob) {
      var url;
      var link;
      if (!blob) {
        estimateResultMessage.textContent = "견적서 이미지를 만들지 못했어요.";
        return;
      }
      url = URL.createObjectURL(blob);
      link = document.createElement("a");
      link.href = url;
      link.download = "나만의-집-견적서.png";
      link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    }, "image/png");
  }

  function showStep(number) {
    var indicators = document.querySelectorAll("[data-step-indicator]");
    step1.hidden = number !== 1;
    step2.hidden = number !== 2;
    step3.hidden = number !== 3;
    step4.hidden = number !== 4;
    Array.prototype.forEach.call(indicators, function (item) {
      item.classList.toggle("is-current", item.dataset.stepIndicator === String(number));
    });
    document.getElementById("step-" + number).scrollIntoView({ behavior: "smooth", block: "start" });
  }

  goStep2.addEventListener("click", function () {
    if (!state.recommendation || !state.pieces.length) return;
    boardDimensions.textContent = "설계용 외곽 " + (state.cols * CELL).toFixed(1) + " × " + (state.rows * CELL).toFixed(1) + "m · 격자 한 칸 0.5m";
    showStep(2);
    drawBoard();
  });
  backStep1.addEventListener("click", function () { showStep(1); });
  goStep3.addEventListener("click", function () {
    showStep(3);
    runPlanMatching();
  });
  backStep2.addEventListener("click", function () { showStep(2); });
  backStep2Bottom.addEventListener("click", function () { showStep(2); });
  goStep4.addEventListener("click", function () {
    if (!resolveQuote()) return;
    renderEstimateStep();
    showStep(4);
  });
  backStep3.addEventListener("click", function () { showStep(3); });
  backStep3Bottom.addEventListener("click", function () { showStep(3); });
  resetSizeButton.addEventListener("click", resetSelectedSize);
  autoPlaceButton.addEventListener("click", autoPlace);
  clearBoardButton.addEventListener("click", clearBoard);
  planScope.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-scope]");
    if (!button || state.planScope === button.dataset.scope) return;
    state.planScope = button.dataset.scope;
    updatePlanScope();
    runPlanMatching();
  });
  viewMode.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-view]");
    if (!button) return;
    state.viewMode = button.dataset.view;
    renderPlanMatches();
  });
  targetYears.addEventListener("input", runEstimate);
  saveEstimateButton.addEventListener("click", saveEstimateImage);

  renderControls();
  renderDistrictControl();
  showUnavailable("혜성의 추천 로직과 면적 가이드가 연결되면 이곳에 실제 근거가 있는 값이 표시됩니다.");
  loadData();
}());
