(function () {
  "use strict";

  var CELL = 0.5;
  var PX = 22;
  // 휴대폰처럼 좁은 화면에서는 편집판을 화면 폭에 맞추고 글자·손잡이를 키운다
  var narrowQuery = window.matchMedia("(max-width: 699px)");
  function isNarrow() { return narrowQuery.matches; }
  function trayWidth() { return isNarrow() ? Math.max(state.cols, 12) : Math.max(state.cols, 28); }
  var MARGIN = 2;
  var NAMES = { living: "거실", kitchen: "주방", room1: "방1", room2: "방2", room3: "방3", room4: "방4", bath1: "욕실1", bath2: "욕실2", entry: "현관" };
  var COLORS = { living: "--living", kitchen: "--kitchen", room1: "--room1", room2: "--room2", room3: "--room3", room4: "--room4", bath1: "--bath", bath2: "--bath", entry: "--entry" };
  var PLAN_COLORS = { living: "--living", kitchen: "--kitchen", room: "--room1", bath: "--bath", entry: "--entry" };
  var PLAN_NAMES = { living: "거실", kitchen: "주방", room: "방", bath: "욕실", entry: "현관" };
  var SVG_NS = "http://www.w3.org/2000/svg";
  var state = { rooms: 3, baths: 2, cols: 0, rows: 0, pieces: [], selected: null, group: [], trayRows: 0, recommendation: null, guide: null, mineRects: [], matches: [], selectedMatch: null, viewMode: "side", planScope: "daejeon", gu: "서구", similar: null, selectedApartment: null, estimate: null, quotePrice: null, quoteSource: "" };
  var logicApi = null;
  var areaGuides = [];
  var recommendationRequestId = 0;
  var matchRequestId = 0;
  var similarRequestId = 0;
  var estimateRequestId = 0;
  var drag = null;
  state.editing = null; // 크기 조정 중인 조각 (집 안의 조각을 한 번 더 누르면 켜짐)
  var resize = null;
  var marquee = null;

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
    apartmentSource.textContent = "실거래 데이터에는 방 개수가 없어 내 집 전용면적 ±5㎡와 지역으로 비교합니다.";
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
      if (control === bathsControl && state.rooms === 4 && value === 1) { button.disabled = true; button.title = "방 4개는 화장실 2개로 추천해요"; }
      button.addEventListener("click", function () { onPick(value); });
      control.append(button);
    });
  }

  function renderControls() {
    renderSegmented(roomsControl, [1, 2, 3, 4], state.rooms, function (value) {
      state.rooms = value;
      if (value === 4) state.baths = 2; // 방 4개는 화장실 2개 조합만 있다
      renderControls();
      updateRecommendation();
    });
    renderSegmented(bathsControl, [1, 2], state.baths, function (value) {
      if (state.rooms === 4 && value === 1) return;
      state.baths = value;
      renderControls();
      updateRecommendation();
    });
  }

  function showUnavailable(message) {
    resetDownstream();
    state.recommendation = null;
    state.guide = null;
    state.group = [];
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
    state.group = [];
    state.pieces = pieces;
    state.selected = null;
    state.editing = null;
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
    var maxWidth = trayWidth();
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
    width = trayWidth() + MARGIN * 2;
    var trayGap = isNarrow() ? 4 : 3;
    height = state.rows + MARGIN * 2 + trayGap + state.trayRows + 1;
    trayY = originY + state.rows + trayGap;
    board.setAttribute("viewBox", "0 0 " + (width * PX) + " " + (height * PX));
    markup += '<rect x="' + (originX * PX) + '" y="' + (originY * PX) + '" width="' + (state.cols * PX) + '" height="' + (state.rows * PX) + '" fill="var(--hall)"/>';
    for (column = 0; column <= state.cols; column += 1) markup += '<line x1="' + ((originX + column) * PX) + '" y1="' + (originY * PX) + '" x2="' + ((originX + column) * PX) + '" y2="' + ((originY + state.rows) * PX) + '" stroke="var(--grid)"/>';
    for (row = 0; row <= state.rows; row += 1) markup += '<line x1="' + (originX * PX) + '" y1="' + ((originY + row) * PX) + '" x2="' + ((originX + state.cols) * PX) + '" y2="' + ((originY + row) * PX) + '" stroke="var(--grid)"/>';
    markup += '<rect x="' + (originX * PX) + '" y="' + (originY * PX) + '" width="' + (state.cols * PX) + '" height="' + (state.rows * PX) + '" fill="none" stroke="var(--ink)" stroke-width="5"/>';
    var labelSize = isNarrow() ? 17 : 12;
    markup += '<text class="mono" x="' + ((originX + state.cols / 2) * PX) + '" y="' + ((originY - .6) * PX) + '" text-anchor="middle" font-size="' + labelSize + '">북쪽</text>';
    markup += '<text class="mono" x="' + ((originX + state.cols / 2) * PX) + '" y="' + ((originY + state.rows + 1.4) * PX) + '" text-anchor="middle" font-size="' + labelSize + '">남쪽 · 해가 드는 쪽</text>';
    markup += '<text class="mono" x="' + (originX * PX) + '" y="' + ((trayY - .5) * PX) + '" font-size="' + labelSize + '">' + (isNarrow() ? '대기실 · 끌어서 집 안에 놓기' : '대기실 · 공간 조각을 집 안으로 끌어 보세요') + '</text>';
    // 크기 조정 중인 조각은 맨 나중에 그려 옆 조각이 테두리 손잡이를 덮지 않게 한다
    state.pieces.map(function (piece, index) { return index; }).sort(function (left, right) {
      return (left === state.editing) - (right === state.editing);
    }).forEach(function (index) {
      var piece = state.pieces[index];
      var pieceX = piece.x !== null ? originX + piece.x : originX + piece.tx;
      var pieceY = piece.y !== null ? originY + piece.y : trayY + piece.ty;
      var narrow = isNarrow();
      var fontSize = narrow ? Math.min(22, Math.max(14, piece.w * 3.6)) : Math.min(15, Math.max(10, piece.w * 3));
      var grip = narrow ? 30 : 16;
      var inset = narrow ? 12 : 7;
      var selected = (state.selected === index || inGroup(index) ? " selected" : "") + (state.editing === index ? " editing" : "");
      var handles = "";
      if (piece.x !== null && state.editing === index) {
        handles = '<rect class="resize-edge ns" data-side="top" x="' + inset + '" y="' + (-grip / 2) + '" width="' + (piece.w * PX - inset * 2) + '" height="' + grip + '"/>'
          + '<rect class="resize-edge ns" data-side="bottom" x="' + inset + '" y="' + (piece.h * PX - grip / 2) + '" width="' + (piece.w * PX - inset * 2) + '" height="' + grip + '"/>'
          + '<rect class="resize-edge ew" data-side="left" x="' + (-grip / 2) + '" y="' + inset + '" width="' + grip + '" height="' + (piece.h * PX - inset * 2) + '"/>'
          + '<rect class="resize-edge ew" data-side="right" x="' + (piece.w * PX - grip / 2) + '" y="' + inset + '" width="' + grip + '" height="' + (piece.h * PX - inset * 2) + '"/>';
        // 네 모서리: 가로·세로를 한 번에 (대각선) 조절
        [["top-left", 0, 0, "nwse"], ["top-right", 1, 0, "nesw"], ["bottom-left", 0, 1, "nesw"], ["bottom-right", 1, 1, "nwse"]].forEach(function (c) {
          var size = grip * 1.15;
          handles += '<rect class="resize-edge corner ' + c[3] + '" data-side="' + c[0] + '" x="' + (c[1] * piece.w * PX - size / 2) + '" y="' + (c[2] * piece.h * PX - size / 2) + '" width="' + size + '" height="' + size + '" rx="3"/>';
        });
      }
      markup += '<g class="piece' + selected + '" data-index="' + index + '" transform="translate(' + (pieceX * PX) + ' ' + (pieceY * PX) + ')">'
        + '<rect class="piece-shape" width="' + (piece.w * PX) + '" height="' + (piece.h * PX) + '" fill="var(' + COLORS[piece.id] + ')" stroke="var(--ink)" stroke-width="2.5"/>'
        + '<text x="' + (piece.w * PX / 2) + '" y="' + (piece.h * PX / 2 - 2) + '" text-anchor="middle" font-size="' + fontSize + '" font-weight="700">' + NAMES[piece.id] + '</text>'
        + '<text class="mono" x="' + (piece.w * PX / 2) + '" y="' + (piece.h * PX / 2 + fontSize) + '" text-anchor="middle" font-size="' + Math.max(narrow ? 13 : 9, fontSize - (narrow ? 7 : 4)) + '">' + (piece.w * CELL).toFixed(1) + '×' + (piece.h * CELL).toFixed(1) + 'm</text>'
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
    if (piece && state.editing === state.selected) selectionStatus.textContent = NAMES[piece.id] + " 크기 조정 중 · 파란 테두리를 끌어 보세요. 다 됐으면 조각을 한 번 더 누르세요.";
    else selectionStatus.textContent = piece ? NAMES[piece.id] + " 선택됨 · " + (piece.w * CELL).toFixed(1) + " × " + (piece.h * CELL).toFixed(1) + "m" + (piece.x !== null ? " · 한 번 더 누르면 크기 조정" : "") : "조각을 선택해 주세요.";
  }

  function svgPoint(event) {
    var point = board.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(board.getScreenCTM().inverse());
  }

  function inGroup(index) { return Array.isArray(state.group) && state.group.length > 1 && state.group.indexOf(index) >= 0; }

  function startDrag(event) {
    var element = event.currentTarget;
    var index = Number(element.dataset.index);
    var point = svgPoint(event);
    var matrix = element.transform.baseVal.consolidate().matrix;
    state.selected = index;
    drag = { element: element, index: index, dx: point.x - matrix.e, dy: point.y - matrix.f, startX: event.clientX, startY: event.clientY, moved: false, wasEditing: state.editing === index,
      px: point.x, py: point.y, group: null };
    if (inGroup(index)) {
      // 묶음으로 고른 조각을 잡으면 묶음 전체를 함께 옮긴다
      drag.group = state.group.map(function (i) {
        var el = board.querySelector('.piece[data-index="' + i + '"]');
        var m = el.transform.baseVal.consolidate().matrix;
        el.classList.add("dragging");
        return { index: i, element: el, x: m.e, y: m.f };
      });
    } else {
      state.group = [];
    }
    if (state.editing !== null && state.editing !== index) state.editing = null;
    event.preventDefault();
    element.classList.add("dragging", "selected");
    element.parentNode.append(element);
    // 휴대폰에서는 끄는 도중 조각이 다시 그려지거나 스크롤이 끼어들어 이벤트를 놓치기 쉬워 창 전체에서 받는다
    try { element.setPointerCapture(event.pointerId); } catch (error) { /* 무시 */ }
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    // 끄는 도중 안내 문구 길이가 바뀌면 화면이 밀려 조각이 엉뚱한 칸에 놓인다. 묶음일 때는 문구를 그대로 둔다
    if (!drag.group) updateToolState();
  }

  function moveDrag(event) {
    var point;
    if (!drag) return;
    event.preventDefault();
    if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 6) drag.moved = true;
    point = svgPoint(event);
    drag.last = point;
    if (drag.group) {
      drag.group.forEach(function (g) { g.element.setAttribute("transform", "translate(" + (g.x + point.x - drag.px) + " " + (g.y + point.y - drag.py) + ")"); });
      return;
    }
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
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    piece = state.pieces[active.index];
    if (active.group && active.moved) { endGroupDrag(active, event); return; }
    if (active.group) state.group = [];
    if (!active.moved) {
      // 누르기만 한 경우: 집 안의 조각이면 크기 조정 모드를 켜고 끈다
      state.editing = piece.x !== null && !active.wasEditing ? active.index : null;
      drawBoard();
      return;
    }
    state.editing = null;
    matrix = active.element.transform.baseVal.consolidate().matrix;
    gridX = Math.round(matrix.e / PX) - MARGIN;
    gridY = Math.round(matrix.f / PX) - MARGIN;
    if (gridX >= 0 && gridY >= 0 && gridX + piece.w <= state.cols && gridY + piece.h <= state.rows && !overlaps(active.index, gridX, gridY, piece.w, piece.h)) {
      piece.x = gridX;
      piece.y = gridY;
      moved = true;
    } else if (matrix.f / PX > MARGIN + state.rows + 1) {
      piece.x = null;
      piece.y = null;
      moved = "tray";
    }
    drawBoard();
    selectionStatus.textContent = moved === "tray" ? NAMES[piece.id] + "을 대기실로 돌려놨어요." : moved ? NAMES[piece.id] + " 위치를 0.5m 격자에 맞췄어요. 한 번 더 누르면 크기를 바꿀 수 있어요." : "놓을 수 없는 위치라 이전 자리로 돌아갔어요.";
  }

  function endGroupDrag(active) {
    // 손을 뗄 때 좌표가 비어 오는 기기가 있어 마지막으로 움직인 위치를 쓴다
    var point = active.last || { x: active.px, y: active.py };
    var dx = Math.round((point.x - active.px) / PX);
    var dy = Math.round((point.y - active.py) / PX);
    var members = active.group.map(function (g) { return state.pieces[g.index]; });
    var inHouse = members.every(function (p) { return p.x !== null; });
    var ok = inHouse && members.every(function (p) {
      var x = p.x + dx, y = p.y + dy;
      return x >= 0 && y >= 0 && x + p.w <= state.cols && y + p.h <= state.rows && !state.pieces.some(function (o) {
        return members.indexOf(o) < 0 && o.x !== null && x < o.x + o.w && o.x < x + p.w && y < o.y + o.h && o.y < y + p.h;
      });
    });
    var toTray = !ok && point.y / PX > MARGIN + state.rows + 1;
    state.editing = null;
    if (ok) members.forEach(function (p) { p.x += dx; p.y += dy; });
    else if (toTray) { members.forEach(function (p) { p.x = null; p.y = null; }); state.group = []; }
    drawBoard();
    selectionStatus.textContent = ok ? "묶음 " + members.length + "개를 함께 옮겼어요." : toTray ? "묶음 " + members.length + "개를 대기실로 돌려놨어요." : "벽이나 다른 조각에 걸려 묶음이 이전 자리로 돌아갔어요.";
  }

  // 집 안의 빈 곳(복도)에서 끌면 사각형 안에 걸친 조각을 묶음으로 고른다
  function houseCell(point) {
    return { x: point.x / PX - MARGIN, y: point.y / PX - MARGIN };
  }
  function insideHouse(point) {
    var c = houseCell(point);
    return c.x >= 0 && c.y >= 0 && c.x <= state.cols && c.y <= state.rows;
  }
  function startMarquee(event) {
    var point;
    if (drag || resize || event.button > 0) return;
    if (event.target.closest && event.target.closest(".piece")) return;
    point = svgPoint(event);
    if (!insideHouse(point)) return;
    event.preventDefault();
    marquee = { x: point.x, y: point.y, startX: event.clientX, startY: event.clientY, moved: false, el: document.createElementNS("http://www.w3.org/2000/svg", "rect") };
    marquee.el.setAttribute("class", "marquee");
    board.append(marquee.el);
    window.addEventListener("pointermove", moveMarquee);
    window.addEventListener("pointerup", endMarquee);
    window.addEventListener("pointercancel", endMarquee);
  }
  function marqueeBox(point, m) {
    m = m || marquee;
    return { x: Math.min(m.x, point.x), y: Math.min(m.y, point.y), w: Math.abs(point.x - m.x), h: Math.abs(point.y - m.y) };
  }
  function moveMarquee(event) {
    var box;
    if (!marquee) return;
    event.preventDefault();
    if (Math.abs(event.clientX - marquee.startX) + Math.abs(event.clientY - marquee.startY) > 6) marquee.moved = true;
    marquee.last = svgPoint(event);
    box = marqueeBox(marquee.last);
    marquee.el.setAttribute("x", box.x); marquee.el.setAttribute("y", box.y);
    marquee.el.setAttribute("width", box.w); marquee.el.setAttribute("height", box.h);
  }
  function endMarquee(event) {
    var active = marquee;
    var box;
    var x1, y1, x2, y2;
    if (!active) return;
    marquee = null;
    window.removeEventListener("pointermove", moveMarquee);
    window.removeEventListener("pointerup", endMarquee);
    window.removeEventListener("pointercancel", endMarquee);
    state.editing = null;
    if (!active.moved) {
      state.group = [];
      state.selected = null;
      drawBoard();
      return;
    }
    box = marqueeBox(active.last || { x: active.x, y: active.y }, active);
    x1 = box.x / PX - MARGIN; y1 = box.y / PX - MARGIN; x2 = x1 + box.w / PX; y2 = y1 + box.h / PX;
    state.group = [];
    state.pieces.forEach(function (p, i) {
      if (p.x !== null && p.x < x2 && x1 < p.x + p.w && p.y < y2 && y1 < p.y + p.h) state.group.push(i);
    });
    state.selected = state.group.length === 1 ? state.group[0] : null;
    if (state.group.length < 2) state.group = [];
    drawBoard();
    if (state.group.length > 1) selectionStatus.textContent = "조각 " + state.group.length + "개를 묶었어요. 묶음 안의 조각을 끌면 함께 움직여요. 빈 곳을 누르면 풀려요.";
  }

  function startResize(event) {
    var group;
    var index;
    var piece;
    event.stopPropagation();
    event.preventDefault();
    group = event.currentTarget.parentNode;
    index = Number(group.dataset.index);
    piece = state.pieces[index];
    state.selected = index;
    resize = { group: group, index: index, side: event.currentTarget.dataset.side, x: piece.x, y: piece.y, w: piece.w, h: piece.h };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) { /* 무시 */ }
    window.addEventListener("pointermove", moveResize);
    window.addEventListener("pointerup", endResize);
    window.addEventListener("pointercancel", endResize);
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
    // 집 벽을 넘지 않게 자르고, 옆 조각에 닿으면 그 앞에서 멈춘다
    if (resize.side.indexOf("right") >= 0) {
      width = Math.min(Math.max(2, gridX - piece.x), state.cols - piece.x);
      while (width > piece.w && overlaps(resize.index, x, y, width, height)) width -= 1;
    }
    if (resize.side.indexOf("bottom") >= 0) {
      height = Math.min(Math.max(2, gridY - piece.y), state.rows - piece.y);
      while (height > piece.h && overlaps(resize.index, x, y, width, height)) height -= 1;
    }
    if (resize.side.indexOf("left") >= 0) {
      next = Math.max(0, Math.min(gridX, piece.x + piece.w - 2));
      while (next < piece.x && overlaps(resize.index, next, y, piece.x + piece.w - next, height)) next += 1;
      width = piece.x + piece.w - next;
      x = next;
    }
    if (resize.side.indexOf("top") >= 0) {
      next = Math.max(0, Math.min(gridY, piece.y + piece.h - 2));
      while (next < piece.y && overlaps(resize.index, x, next, width, piece.y + piece.h - next)) next += 1;
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
    window.removeEventListener("pointermove", moveResize);
    window.removeEventListener("pointerup", endResize);
    window.removeEventListener("pointercancel", endResize);
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

  function clearBoard() {
    // 위치와 함께 크기도 평수 기준 원래 크기로 되돌린다
    state.pieces.forEach(function (piece) { piece.x = null; piece.y = null; piece.w = piece.w0; piece.h = piece.h0; });
    state.selected = null;
    state.editing = null;
    state.group = [];
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

  // 예시 배치: 실제 판상형 평면도처럼 남쪽 줄(방2·거실·안방, 방 4개면 방3도)과 북쪽 줄(방3·공용 욕실·현관·주방)을
  // 두고 두 줄 사이를 복도로 비운다. 안방 욕실(욕실2)은 오른쪽 끝, 안방 바로 위.
  // 조각 크기는 build-data.py가 이 틀에 맞춰 정해 두었으므로 여기서는 자리만 잡는다.
  function autoPlace() {
    var get = function (id) { return state.pieces.find(function (piece) { return piece.id === id; }); };
    var row = function (ids, south) {
      var x = 0;
      ids.map(get).filter(Boolean).forEach(function (piece) {
        piece.x = x;
        piece.y = south ? state.rows - piece.h : 0;
        x += piece.w;
      });
    };
    var masterBath = get("bath2");
    var master = get("room1");
    var example = state.guide && state.guide.example;
    state.pieces.forEach(function (piece) { piece.x = null; piece.y = null; piece.w = piece.w0; piece.h = piece.h0; });
    if (example && example.pieces) {
      // 같은 방·욕실 구성의 실제 대전 단지 도면을 집 격자에 옮긴 예시 (build-data.py가 만든 칸 좌표)
      state.pieces.forEach(function (piece) {
        var p = example.pieces[piece.id];
        if (!Array.isArray(p) || p.length < 4) return;
        piece.x = p[0]; piece.y = p[1]; piece.w = p[2]; piece.h = p[3];
      });
    } else {
      row(state.rooms >= 4 ? ["room3", "room2", "living", "room1"] : ["room2", "living", "room1"], true);
      row([state.rooms >= 4 ? "room4" : "room3", "bath1", "entry", "kitchen"], false);
    }
    if (!example && masterBath && master) {
      masterBath.x = state.cols - masterBath.w;
      masterBath.y = master.y - masterBath.h;
    }
    // 혹시 겹치거나 집 밖이면 그 조각만 원래 크기로 되돌려 아래에서 빈자리를 찾게 한다
    state.pieces.forEach(function (piece, index) {
      if (piece.x === null) return;
      if (piece.x + piece.w > state.cols || piece.y < 0 || overlaps(index, piece.x, piece.y, piece.w, piece.h)) {
        piece.x = null; piece.y = null; piece.w = piece.w0; piece.h = piece.h0;
      }
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
    state.editing = null;
    state.group = [];
    renderPieceList();
    drawBoard();
    selectionStatus.textContent = example && example.refName ? "실제 대전 아파트(" + example.refName + ") 구조를 본뜬 예시 배치예요. 조각을 옮겨 내 집으로 바꿔 보세요." : state.baths === 2 ? "안방 욕실은 안방 옆에, 공용 욕실은 복도 쪽에 둔 예시 배치예요." : "공용 욕실을 복도 쪽에 둔 예시 배치예요.";
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

  // aspect: 가로/세로 비율(없으면 2:1). big: 확대 보기용 큰 글씨
  function createPlanSvg(rects, overlayRects, label, aspect, big) {
    var width = big ? 600 : 240;
    var height = Math.round(width / (Number(aspect) > 0 ? Math.min(2.4, Math.max(0.6, Number(aspect))) : 2));
    var fontSize = big ? 15 : 9;
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
      shape = svgNode("rect", { x: x * width, y: y * height, width: w * width, height: h * height, fill: "var(" + (PLAN_COLORS[rect.t] || "--hall") + ")", stroke: "var(--ink)", "stroke-width": 1.8 });
      svg.append(shape);
      if (w * width > fontSize * 2.6 && h * height > fontSize * 1.5) {
        text = svgNode("text", { x: (x + w / 2) * width, y: (y + h / 2) * height + fontSize * .4, "text-anchor": "middle", "font-size": fontSize, fill: "var(--ink)" });
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
      svg.append(svgNode("rect", { x: x * width, y: y * height, width: w * width, height: h * height, fill: "none", stroke: "var(--warn)", "stroke-width": big ? 3 : 2, "stroke-dasharray": big ? "9 5" : "5 3" }));
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

  function mineAspect() { return state.rows ? state.cols / state.rows : 2; }

  // 비교 화면에서 도면을 누르면 크게 띄운다 (나란히 / 겹쳐 보기 전환, 원본 페이지 링크)
  function openPlanZoom(match, index) {
    var plan = match.plan || {};
    var dialog = document.getElementById("plan-zoom");
    var mode = state.viewMode === "overlay" ? "overlay" : "side";
    var body;
    var render;
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "plan-zoom";
      dialog.className = "plan-zoom";
      document.body.append(dialog);
      dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
      // 닫은 뒤 눌렀던 도면 묶음에 포커스 테두리가 남지 않게 한다
      dialog.addEventListener("close", function () { setTimeout(function () { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }, 0); });
    }
    dialog.replaceChildren();
    var head = document.createElement("div");
    var title = document.createElement("h3");
    var close = document.createElement("button");
    var toggle = document.createElement("div");
    head.className = "plan-zoom-head";
    title.textContent = (index + 1) + "위 · " + String(plan.apt || "실제 평면도") + " " + String(plan.type || "") + " · 일치율 " + String(Number(match.score) || 0) + "%";
    close.type = "button";
    close.className = "plan-zoom-close";
    close.setAttribute("aria-label", "닫기");
    close.textContent = "×";
    close.addEventListener("click", function () { dialog.close(); });
    head.append(title, close);
    toggle.className = "segmented plan-zoom-toggle";
    [["side", "나란히"], ["overlay", "겹쳐 보기"]].forEach(function (option) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = option[1];
      b.dataset.mode = option[0];
      b.addEventListener("click", function () { mode = option[0]; render(); });
      toggle.append(b);
    });
    body = document.createElement("div");
    render = function () {
      Array.prototype.forEach.call(toggle.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === mode)); });
      body.replaceChildren();
      body.className = "plan-zoom-body" + (mode === "overlay" ? " is-overlay" : "");
      var add = function (svg, text) {
        var figure = document.createElement("figure");
        var caption = document.createElement("figcaption");
        caption.textContent = text;
        figure.append(svg, caption);
        body.append(figure);
      };
      if (mode === "overlay") {
        add(createPlanSvg(plan.rects, state.mineRects, "실제 평면도 위에 내 도면을 겹친 비교", plan.aspect, true), "색칠: " + String(plan.apt || "실제 평면도") + " · 주황 점선: 내 도면");
      } else {
        add(createPlanSvg(state.mineRects, null, "내가 만든 평면도", mineAspect(), true), "내 도면");
        add(createPlanSvg(plan.rects, null, "실제 평면도", plan.aspect, true), String(plan.apt || "실제 평면도") + " " + String(plan.type || ""));
      }
    };
    render();
    var note = document.createElement("p");
    note.className = "plan-zoom-note";
    note.textContent = "실제 평면도는 원본 도면을 보고 방 배치만 다시 그린 그림이에요. 아래쪽이 남쪽입니다.";
    dialog.append(head, toggle, body, note);
    var link = createSourceLink(plan);
    if (link) dialog.append(link);
    dialog.showModal();
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
      card.className = "plan-match-card";
      head.className = "plan-match-head";
      title.textContent = (index + 1) + "위 · " + String(plan.apt || "실제 평면도") + " " + String(plan.type || "");
      meta.textContent = String(plan.region || "지역 정보 없음") + " · 전용 " + String(plan.area || "-") + "㎡ · 방 " + String(plan.rooms || "-") + " · 욕실 " + String(plan.baths || "-");
      score.className = "match-score";
      score.textContent = String(Number(match.score) || 0) + "%";
      titleWrap.append(title, meta);
      head.append(titleWrap, score);
      pair.className = "plan-pair" + (state.viewMode === "overlay" ? " is-overlay" : "");
      if (state.viewMode === "overlay") {
        planFigure.append(createPlanSvg(plan.rects, state.mineRects, "실제 평면도 위에 내 도면을 겹친 비교", plan.aspect));
        caption = document.createElement("figcaption");
        caption.textContent = "색칠: 실제 평면도 · 주황 점선: 내 도면";
        planFigure.append(caption);
        pair.append(planFigure);
      } else {
        mineFigure.append(createPlanSvg(state.mineRects, null, "내가 만든 평면도", mineAspect()));
        caption = document.createElement("figcaption");
        caption.textContent = "내 도면";
        mineFigure.append(caption);
        planFigure.append(createPlanSvg(plan.rects, null, "실제 평면도", plan.aspect));
        caption = document.createElement("figcaption");
        caption.textContent = String(plan.apt || "실제 평면도") + " " + String(plan.type || "");
        planFigure.append(caption);
        pair.append(mineFigure, planFigure);
      }
      // 두 그림을 한 덩어리로 눌러 크게 본다
      pair.classList.add("zoomable");
      pair.tabIndex = 0;
      pair.setAttribute("role", "button");
      pair.setAttribute("aria-label", "두 도면 크게 보기");
      pair.addEventListener("click", function () { openPlanZoom(match, index); });
      pair.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPlanZoom(match, index); } });
      parts.className = "match-parts";
      (Array.isArray(match.parts) ? match.parts : []).forEach(function (part) {
        var item = document.createElement("li");
        item.className = part.same ? "is-same" : "";
        item.textContent = String(part.name || PLAN_NAMES[part.t] || part.t) + (part.same ? " 비슷" : " 다름");
        parts.append(item);
      });
      tradeCopy.className = "match-trade";
      if (trade) {
        tradeCopy.textContent = (trade.estimated ? "단지 실거래 환산(전용 " + String(trade.baseArea) + "㎡ 거래 기준)" : "단지 실거래") + " · 최근 매매 " + formatPrice(trade.lastSale) + (trade.saleDate ? " (" + String(trade.saleDate) + ")" : "") + " · 1년 중앙값 " + formatPrice(trade.sale) + " · 전세 " + formatPrice(trade.jeonse);
      } else {
        tradeCopy.textContent = "연결된 단지 거래 정보가 없습니다. 견적서는 선택 지역·면적의 매매 중앙값을 사용합니다.";
      }
      // 도면 카드는 몇 % 닮았는지 추천만 한다. 시세는 아래에서 내 집 크기 기준으로 찾는다
      card.append(head, pair, parts, tradeCopy);
      if (sourceLink) card.append(sourceLink);
      planMatchList.append(card);
    });
  }

  // 대전 단지 도면을 고르면 지역 선택도 그 단지의 구로 맞춘다.
  function followPlanGu(match) {
    var gu = match && match.plan && match.plan.trade && match.plan.trade.gu;
    if (gu && gu !== state.gu) { state.gu = gu; renderDistrictControl(); }
  }

  function selectMatch(match) {
    state.selectedMatch = match;
    followPlanGu(match);
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
    Promise.resolve(logicApi.matchPlans(mine, { area: Number(state.recommendation.area), rooms: state.rooms, baths: state.baths, limit: 3, daejeonOnly: state.planScope === "daejeon" })).then(function (matches) {
      if (requestId !== matchRequestId) return;
      if (!Array.isArray(matches)) throw new Error("평면도 비교 반환값이 규격과 다릅니다.");
      state.matches = matches.filter(function (match) { return match && match.plan && Array.isArray(match.plan.rects); }).slice(0, 3);
      if (!state.matches.length) throw new Error("조건에 맞는 실제 평면도를 찾지 못했어요.");
      state.selectedMatch = state.matches[0];
      followPlanGu(state.selectedMatch);
      renderPlanMatches();
      planSource.textContent = "도면 출처: " + String(state.selectedMatch.plan.sourceName || "출처 정보 없음") + ". 일치율은 같은 공간의 겹침과 중심 위치를 함께 비교한 참고값입니다.";
      matchStatus.textContent = (state.matches.some(function (m) { return m.sameConfig; }) ? "방 " + state.rooms + "개·욕실 " + state.baths + "개 구성이 같은 도면을 먼저, " : "대전에 방 " + state.rooms + "개·욕실 " + state.baths + "개 도면이 없어 비슷한 크기 도면으로, ") + (state.planScope === "daejeon" ? "대전 아파트에서 " : "전국 " + (matches.total || "") + "개 도면에서 ") + "가장 닮은 " + state.matches.length + "개를 찾았어요.";
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
    var area = myArea();
    summaryCount.textContent = (Number.isFinite(count) ? count : result.items.length) + "곳";
    summarySale.textContent = formatPrice(summary.medianSale);
    summaryJeonse.textContent = formatPrice(summary.medianJeonse);
    marketSummary.hidden = false;
    apartmentSource.textContent = "비교 기준: " + (Number.isFinite(area) ? "내 집 전용면적 " + area + "㎡ ±5㎡" : "내 집 전용면적 ±5㎡") + " · " + state.gu + ". " + (summary.period ? "거래 기간 " + String(summary.period) + ". " : "") + "출처: " + String(summary.source || "국토교통부 아파트 매매·전월세 실거래가 공개 API") + ".";
  }

  function myArea() { return state.recommendation ? Number(state.recommendation.area) : NaN; }

  // 견적 가격: 목록에서 고른 아파트 → 내 집 크기·지역 매매 중앙값 → (거래가 없으면) 가장 닮은 대전 단지 실거래가
  function resolveQuote() {
    var match = state.selectedMatch;
    var trade = match && match.trade;
    var tradePrice = trade && Number(trade.lastSale);
    var summary = state.similar && state.similar.summary;
    var medianPrice = summary && Number(summary.medianSale);
    var area = myArea();
    var picked = state.selectedApartment;
    var pickedPrice = picked && apartmentPrice(picked);
    if (Number.isFinite(pickedPrice) && pickedPrice > 0) {
      return {
        price: pickedPrice,
        label: "고른 아파트 최근 실거래가",
        title: String(picked.apt || "고른 아파트"),
        meta: state.gu + (picked.dong ? " " + String(picked.dong) : "") + " · 전용 " + String(picked.area) + "㎡" + (picked.saleDate ? " · " + String(picked.saleDate) + " 거래" : ""),
        source: String(picked.apt || "고른 아파트") + " 최근 실거래가"
      };
    }
    if (Number.isFinite(medianPrice) && medianPrice > 0) {
      return {
        price: medianPrice,
        label: "지역·면적 기준 매매 중앙값",
        title: state.gu + " 내 집 크기 아파트",
        meta: "전용 " + String(area || "-") + "㎡ ±5㎡" + (summary.period ? " · " + String(summary.period) : ""),
        source: state.gu + " 전용 " + String(area || "-") + "㎡ ±5㎡ 매매 중앙값"
      };
    }
    if (Number.isFinite(tradePrice) && tradePrice > 0) {
      return {
        price: tradePrice,
        label: trade.estimated ? "같은 단지 실거래가 면적 환산" : "단지 최근 실거래가",
        title: String(trade.apt || match.plan.apt || "선택한 단지"),
        meta: String(trade.gu || "") + (trade.dong ? " " + String(trade.dong) : "") + " · 전용 " + String(trade.area || area || "-") + "㎡" + (trade.estimated ? " (전용 " + String(trade.baseArea) + "㎡ 거래가 환산)" : "") + (trade.saleDate ? " · " + String(trade.saleDate) + " 거래" : ""),
        source: trade.estimated ? "같은 단지 전용 " + String(trade.baseArea) + "㎡ 실거래가를 면적 비율로 환산" : "선택한 평면도와 연결된 단지 최근 실거래가"
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
    state.selectedApartment = state.selectedApartment === item ? null : item; // 다시 누르면 선택 해제
    state.estimate = null;
    saveEstimateButton.disabled = true;
    renderApartmentList(state.similar.items);
    updateQuoteAvailability();
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
    var area = myArea();
    state.similar = null;
    state.selectedApartment = null;
    state.estimate = null;
    marketSummary.hidden = true;
    apartmentList.replaceChildren();
    goStep4.disabled = true;
    if (!Number.isFinite(area)) {
      setSimilarStatus("방·화장실을 고르면 내 집 크기로 대전 실거래가를 찾아요.", "error");
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
    var area = myArea();
    if (!match || !quote) return;
    estimateArea.textContent = Number.isFinite(area) ? "내 집 전용 " + area + "㎡" : "전용면적 정보 없음";
    estimateApartment.textContent = quote.title;
    estimateApartmentMeta.textContent = quote.meta;
    estimatePriceLabel.textContent = quote.label;
    estimatePrice.textContent = formatPrice(quote.price);
    targetYears.value = "";
    state.quotePrice = quote.price;
    state.quoteSource = quote.source;
    renderFloorplanPreview();
    estimateMatchPlan.replaceChildren(createPlanSvg(match.plan.rects, null, "가장 닮은 실제 평면도", match.plan.aspect));
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
    context.strokeStyle = "#dbe1e8";
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
      context.lineWidth = 2.5;
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
    context.fillText("가장 닮은 실제 평면도 · " + String(Number(match.score) || 0) + "%", 560, 195);
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
  autoPlaceButton.addEventListener("click", autoPlace);
  narrowQuery.addEventListener("change", function () { if (state.pieces.length) drawBoard(); });
  // iOS 사파리는 SVG 조각의 touch-action 을 무시하고 화면을 스크롤해 버린다.
  // 조각이나 테두리에서 시작한 터치만 기본 동작(스크롤·확대)을 막아 끌기가 끊기지 않게 한다.
  board.addEventListener("touchstart", function (event) {
    var touch = event.touches[0];
    if (event.target.closest && event.target.closest(".piece")) event.preventDefault();
    else if (touch && event.touches.length === 1 && insideHouse(svgPoint(touch))) event.preventDefault(); // 집 안 빈 곳은 묶음 고르기
  }, { passive: false });
  board.addEventListener("touchmove", function (event) {
    if (drag || resize || marquee) event.preventDefault();
  }, { passive: false });
  board.addEventListener("pointerdown", startMarquee);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.group && state.group.length) { state.group = []; drawBoard(); }
  });
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
