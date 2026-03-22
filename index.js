import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "ST-Hidden-Hub";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
    cubeX: 100,
    cubeY: 100,
    hiddenButtons: [],
    hiddenFloating: [],
    cubeSize: 52,        
    cubeIcon: "🎲",      
    cubeColor: "#b478ff" 
};

function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    if (!extension_settings[extensionName].hiddenButtons) {
        extension_settings[extensionName].hiddenButtons = [];
    }
    if (!extension_settings[extensionName].hiddenFloating) {
        extension_settings[extensionName].hiddenFloating = [];
    }
}

function savePosition(x, y) {
    extension_settings[extensionName].cubeX = x;
    extension_settings[extensionName].cubeY = y;
    saveSettingsDebounced();
}

function clampToScreen(x, y, w, h) {
    const maxX = window.innerWidth - w;
    const maxY = window.innerHeight - h;
    return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY)),
    };
}

function getButtonId(el, i) {
    if (el.id) return el.id;
    
    const meaningful = [...el.classList].find(c =>
        !['drawer', 'interactable', 'closedIcon', 'openIcon', 'menu_button'].includes(c) &&
        !c.startsWith('fa-') &&
        !c.startsWith('tbc-')
    );
    if (meaningful) return meaningful;

    const title = el.getAttribute('title') || el.querySelector('[title]')?.getAttribute('title');
    if (title) {
        return 'tbc-id-' + btoa(encodeURIComponent(title)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
    }

    return `tbc-btn-${i}`;
}

function applyHiddenState() {
    const hidden = extension_settings[extensionName].hiddenButtons;

    document.querySelectorAll('#top-settings-holder > *').forEach((el, i) => {
        if (el.classList.contains('tbc-clone')) return;
        const id = getButtonId(el, i);
        if (hidden.includes(id)) {
            el.classList.add('tbc-hidden-btn');
        } else {
            el.classList.remove('tbc-hidden-btn');
        }
    });

    if (extension_settings[extensionName].hiddenFloating) {
        extension_settings[extensionName].hiddenFloating.forEach(item => {
            $(item.selector).addClass('tbc-hidden-btn');
        });
    }

    renderCubePanel();
}

function toggleHideButton(id) {
    const hidden = extension_settings[extensionName].hiddenButtons;
    const idx = hidden.indexOf(id);
    if (idx === -1) {
        hidden.push(id);
    } else {
        hidden.splice(idx, 1);
    }
    saveSettingsDebounced();
    applyHiddenState();
}

function renderCubePanel() {
    const hidden = extension_settings[extensionName].hiddenButtons;
    const panel = $("#tbc-panel");
    panel.empty();

    const s = extension_settings[extensionName];
    const hasFloating = s.hiddenFloating && s.hiddenFloating.length > 0;

    if (hidden.length === 0 && !hasFloating) {
        panel.append(`<div class="tbc-empty">Панель пуста</div>`);
        return;
    }

    // 1. Рисуем скрытые кнопки из топбара
    document.querySelectorAll('#top-settings-holder > *').forEach((el, i) => {
        if (el.classList.contains('tbc-clone')) return;
        const id = getButtonId(el, i);
        if (!hidden.includes(id)) return;

        const iconEl = el.querySelector('.interactable, .drawer-icon, i');
        const title = el.getAttribute('title')
            || el.querySelector('[title]')?.getAttribute('title')
            || id;
        const faClasses = iconEl
            ? [...iconEl.classList].filter(c => c.startsWith('fa')).join(' ')
            : 'fa-solid fa-question';

        const btn = $(`
            <div class="tbc-panel-btn" title="${title}" data-tbc-id="${id}">
                <i class="${faClasses}"></i>
            </div>
        `);

        btn.on("click", function (e) {
            e.stopPropagation();
            $("#tbc-cube").removeClass("tbc-open");
            $("#tbc-panel").removeClass("tbc-panel-open");

            const wasHidden = el.classList.contains('tbc-hidden-btn');
            if (wasHidden) {
                el.classList.remove('tbc-hidden-btn');
            }

            const target = el.classList.contains('interactable') ? el : (el.querySelector('.interactable') || el);
            target.click();

            if (wasHidden) {
                setTimeout(() => {
                    const hideOnOutsideClick = (docEvent) => {
                        if (el.contains(docEvent.target)) return;
                        el.classList.add('tbc-hidden-btn');
                        document.removeEventListener('click', hideOnOutsideClick);
                    };
                    document.addEventListener('click', hideOnOutsideClick);
                }, 50);
            }
        });

        panel.append(btn);
    });

    // 2. Рисуем пойманные плавающие элементы
    if (hasFloating) {
        if (panel.children('.tbc-panel-btn').length > 0) {
            panel.append('<hr class="tbc-divider" />');
        }

        s.hiddenFloating.forEach((item) => {
            const floatingEl = $(item.selector)[0];
            if (!floatingEl) return;

            const iconEl = floatingEl.querySelector('[class*="fa-"]');
            let innerContent = '';

            if (iconEl) {
                const iconClass = [...iconEl.classList].filter(c => c.startsWith('fa')).join(' ');
                innerContent = `<i class="${iconClass || 'fa-solid fa-ghost'}"></i>`;
            } else {
                let shortName = (item.title || "??").replace(/[^a-zA-Zа-яА-Я0-9]/g, '').substring(0, 2).toUpperCase();
                if (!shortName) shortName = "??";
                innerContent = `<span class="tbc-text-icon">${shortName}</span>`;
            }

            const floatingBtn = $(`
                <div class="tbc-panel-btn" title="${item.title}" data-tbc-floating="${item.selector}">
                    ${innerContent}
                </div>
            `);

            floatingBtn.on("click", function (e) {
                e.stopPropagation();
                $("#tbc-cube").removeClass("tbc-open");
                $("#tbc-panel").removeClass("tbc-panel-open");

                $(floatingEl).removeClass('tbc-hidden-btn');
                
                const target = floatingEl.classList.contains('interactable') ? floatingEl : (floatingEl.querySelector('.interactable') || floatingEl);
                target.click();

                setTimeout(() => {
                    const hideOnOutsideClick = (docEvent) => {
                        if (floatingEl.contains(docEvent.target)) return;
                        $(floatingEl).addClass('tbc-hidden-btn');
                        document.removeEventListener('click', hideOnOutsideClick);
                    };
                    document.addEventListener('click', hideOnOutsideClick);
                }, 50);
            });

            panel.append(floatingBtn);
        });
    }
}

function buildSettingsPanel() {
    const list = $("#tbc-btn-list");
    list.empty();

    const allButtons = document.querySelectorAll('#top-settings-holder > *');

    if (allButtons.length === 0) {
        list.append(`<p><i>Кнопки топбара не найдены. Нажми "Обновить список".</i></p>`);
        return;
    }

    const hidden = extension_settings[extensionName].hiddenButtons;

    allButtons.forEach((el, i) => {
        if (el.classList.contains('tbc-clone')) return;

        const id = getButtonId(el, i);
        const iconEl = el.querySelector('.interactable, .drawer-icon, i');
        const title = el.getAttribute('title')
            || el.querySelector('[title]')?.getAttribute('title')
            || id;
        const faClasses = iconEl
            ? [...iconEl.classList].filter(c => c.startsWith('fa')).join(' ')
            : 'fa-solid fa-question';

        const isHidden = hidden.includes(id);

        const row = $(`
            <div class="tbc-setting-row">
                <input type="checkbox" id="tbc-chk-${id}" ${isHidden ? "checked" : ""} />
                <label for="tbc-chk-${id}">
                    <i class="${faClasses} tbc-preview-icon"></i>
                    <span class="tbc-btn-label">${title}</span>
                </label>
            </div>
        `);

        row.find("input").on("change", function () {
            toggleHideButton(id);
        });

        list.append(row);
    });
}

function createCube() {
    const s = extension_settings[extensionName];
    const cube = $(`<div id="tbc-cube" title="ЛКМ: открыть | ПКМ: вернуть всё | Тянуть: переместить">${s.cubeIcon || "🎲"}</div>`);
    const panel = $(`<div id="tbc-panel"></div>`);

    $("body").append(cube).append(panel);

    const w = s.cubeSize || 52;
    const h = s.cubeSize || 52;
    const pos = clampToScreen(s.cubeX, s.cubeY, w, h);
    cube.css({ left: pos.x, top: pos.y });
    panel.css({ left: pos.x, top: pos.y + h + 6 });

    let dragging = false;
    let didDrag = false;
    let offsetX = 0, offsetY = 0;

    // Функция для получения координат из события (мышь или тач)
    function getClientCoords(e) {
        const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
        return { clientX, clientY };
    }

    // Функция для блокировки скролла на мобильных
    function setDraggingActive(active) {
        if (active) {
            document.body.classList.add('tbc-dragging-active');
        } else {
            document.body.classList.remove('tbc-dragging-active');
        }
    }

    // Обработчик начала перетаскивания
    function onDragStart(e) {
        // Игнорируем правую кнопку мыши
        if (e.button === 2) return;
        
        // Для touch-событий проверяем, не кликнули ли по интерактивному элементу
        if (e.type === 'touchstart') {
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target.closest && target.closest('button, .tbc-panel-btn, .menu_button')) {
                return;
            }
        }
        
        dragging = true;
        didDrag = false;
        
        const coords = getClientCoords(e);
        offsetX = coords.clientX - parseInt(cube.css("left"));
        offsetY = coords.clientY - parseInt(cube.css("top"));
        
        cube.addClass("tbc-dragging");
        
        // Блокируем скролл на мобильных
        if (e.type === 'touchstart') {
            setDraggingActive(true);
            e.preventDefault();
        }
    }

    // Обработчик перемещения
    function onDragMove(e) {
        if (!dragging) return;
        
        didDrag = true;
        const coords = getClientCoords(e);
        const cw = cube.outerWidth(), ch = cube.outerHeight();
        const pos = clampToScreen(coords.clientX - offsetX, coords.clientY - offsetY, cw, ch);
        
        cube.css({ left: pos.x, top: pos.y });
        panel.css({ left: pos.x, top: pos.y + ch + 6 });
        
        // Предотвращаем скролл во время перетаскивания
        if (e.type === 'touchmove') {
            e.preventDefault();
        }
    }

    // Обработчик окончания перетаскивания
    function onDragEnd() {
        if (!dragging) return;
        
        dragging = false;
        cube.removeClass("tbc-dragging");
        setDraggingActive(false);
        
        if (didDrag) {
            savePosition(parseInt(cube.css("left")), parseInt(cube.css("top")));
        }
        didDrag = false;
    }

    // Mouse events
    cube.on("mousedown", onDragStart);
    $(document).on("mousemove.tbc", onDragMove);
    $(document).on("mouseup.tbc", onDragEnd);
    
    // Touch events для мобильных
    cube.on("touchstart", onDragStart);
    $(document).on("touchmove.tbc", onDragMove);
    $(document).on("touchend.tbc", onDragEnd);
    $(document).on("touchcancel.tbc", onDragEnd);

    // Обработчик клика (открытие панели) с проверкой что это не было перетаскиванием
    cube.on("click", function (e) {
        if (didDrag) {
            didDrag = false;
            return;
        }
        const isOpen = cube.hasClass("tbc-open");
        cube.toggleClass("tbc-open", !isOpen);
        panel.toggleClass("tbc-panel-open", !isOpen);
        if (!isOpen) renderCubePanel();
    });

    // Закрытие панели при клике вне
    $(document).on("click.tbc-outside", function (e) {
        if (!$(e.target).closest("#tbc-cube, #tbc-panel").length) {
            setTimeout(() => {
                cube.removeClass("tbc-open");
                panel.removeClass("tbc-panel-open");
            }, 150);
        }
    });
    
    // Обработка touch-событий для закрытия панели
    $(document).on("touchstart.tbc-outside", function (e) {
        if (!$(e.target).closest("#tbc-cube, #tbc-panel").length) {
            setTimeout(() => {
                cube.removeClass("tbc-open");
                panel.removeClass("tbc-panel-open");
            }, 150);
        }
    });

    cube.on("contextmenu", function (e) {
        e.preventDefault(); 
        resetAll();
    });

    applyHiddenState();
    console.log(`[${extensionName}] 🎲 Cube created`);
}

let sniperMode = false;

function toggleSniperMode() {
    if (sniperMode) return stopSniperMode();
    sniperMode = true;
    
    toastr.info("Наведи на плавающий элемент и кликни по нему. Нажми ESC для отмены.", "Режим охоты");
    $("body").css("cursor", "crosshair");
    
    $(document).on("mouseover.tbc_sniper", function(e) {
        if ($(e.target).closest('#tbc-cube, #tbc-panel, #extensions_settings2').length) return;
        $(e.target).css("outline", "2px solid #880000"); 
    }).on("mouseout.tbc_sniper", function(e) {
        $(e.target).css("outline", "");
    });
    
    // Добавляем поддержку touch для режима охоты
    $(document).on("touchstart.tbc_sniper", function(e) {
        if ($(e.target).closest('#tbc-cube, #tbc-panel, #extensions_settings2').length) return;
        
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            
            $(target).css("outline", "");
            captureFloatingElement(target);
        }
    });

    $(document).on("click.tbc_sniper", function(e) {
        if ($(e.target).closest('#tbc-cube, #tbc-panel, #extensions_settings2').length) return;
        
        e.preventDefault();
        e.stopPropagation();
        captureFloatingElement(e.target);
    });

    $(document).on("keydown.tbc_sniper", function(e) {
        if (e.key === "Escape") stopSniperMode();
    });
}

function captureFloatingElement(target) {
    const targetEl = $(target).closest('[id]')[0] || target;
    const selector = targetEl.id ? `#${targetEl.id}` : null;
    
    $(targetEl).css("outline", "");

    if (!selector) {
        toastr.warning("Не удалось поймать элемент (у него нет ID).", "Top Bar Cube");
        stopSniperMode();
        return;
    }

    const s = extension_settings[extensionName];
    if (!s.hiddenFloating) s.hiddenFloating = [];
    
    if (!s.hiddenFloating.find(item => item.selector === selector)) {
        s.hiddenFloating.push({
            selector: selector,
            title: targetEl.title || targetEl.id
        });
        saveSettingsDebounced();
    }
    
    $(targetEl).addClass('tbc-hidden-btn');
    renderCubePanel(); 
    toastr.success("Элемент спрятан в кубик!", "Успех");
    stopSniperMode();
}

function stopSniperMode() {
    sniperMode = false;
    $("body").css("cursor", "");
    $("*").css("outline", ""); 
    $(document).off(".tbc_sniper"); 
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "180, 120, 255";
}

function updateCubeAppearance() {
    const s = extension_settings[extensionName];
    document.documentElement.style.setProperty('--tbc-size', `${s.cubeSize}px`);
    document.documentElement.style.setProperty('--tbc-color-rgb', hexToRgb(s.cubeColor));
    
    const cube = $("#tbc-cube");
    if (cube.length) cube.text(s.cubeIcon || "🎲");
}

function resetAll() {
    const s = extension_settings[extensionName];
    
    if (s.hiddenFloating) {
        s.hiddenFloating.forEach(item => {
            $(item.selector).removeClass('tbc-hidden-btn');
        });
    }
    
    s.hiddenButtons = [];
    s.hiddenFloating = [];
    saveSettingsDebounced();
    
    $("#tbc-cube").removeClass("tbc-open");
    $("#tbc-panel").removeClass("tbc-panel-open");
    applyHiddenState();
    buildSettingsPanel();
    toastr.warning("Все элементы возвращены на экран", "Top Bar Cube: Сброс");
}

jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);

    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
        $("#extensions_settings2").append(settingsHtml);

        loadSettings();

        // Подключаем слушатели ползунков внешнего вида
        const tbcSettings = extension_settings[extensionName];
        
        $("#tbc-size-input").val(tbcSettings.cubeSize || 52).on("input", function() {
            tbcSettings.cubeSize = $(this).val();
            updateCubeAppearance();
            saveSettingsDebounced();
        });
        
        $("#tbc-icon-input").val(tbcSettings.cubeIcon || "🎲").on("input", function() {
            tbcSettings.cubeIcon = $(this).val();
            updateCubeAppearance();
            saveSettingsDebounced();
        });
        
        $("#tbc-color-input").val(tbcSettings.cubeColor || "#b478ff").on("input", function() {
            tbcSettings.cubeColor = $(this).val();
            updateCubeAppearance();
            saveSettingsDebounced();
        });

        // Слушатели кнопок
        $("#tbc-reset-btn").on("click", function () {
            resetAll();
            buildSettingsPanel();
            toastr.info("Все кнопки возвращены в топбар", "Top Bar Cube");
        });

        $("#tbc-refresh-btn").on("click", function () {
            buildSettingsPanel();
            applyHiddenState();
            toastr.info("Список кнопок обновлён", "Top Bar Cube");
        });

        $("#tbc-sniper-btn").on("click", function () {
            toggleSniperMode();
        });

        function waitForTopBar(cb, tries = 20) {
            const buttons = document.querySelectorAll('#top-settings-holder > *');
            if (buttons.length > 0) {
                cb();
            } else if (tries > 0) {
                setTimeout(() => waitForTopBar(cb, tries - 1), 300);
            } else {
                console.warn(`[${extensionName}] Топбар не найден после ожидания`);
            }
        }

        waitForTopBar(() => {
            createCube();
            buildSettingsPanel();
            updateCubeAppearance();
            
            let tbcUpdateTimer;
            const topBarObserver = new MutationObserver((mutations) => {
                let hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
                if (hasNewNodes) {
                    clearTimeout(tbcUpdateTimer);
                    tbcUpdateTimer = setTimeout(() => {
                        applyHiddenState();
                        buildSettingsPanel();
                        console.log(`[${extensionName}] Обнаружены новые кнопки, обновляем кубик.`);
                    }, 500); 
                }
            });

            const topSettingsHolder = document.getElementById('top-settings-holder');
            if (topSettingsHolder) {
                topBarObserver.observe(topSettingsHolder, { childList: true });
            }

            console.log(`[${extensionName}] ✅ Топбар найден, кнопки загружены`);
        });

        console.log(`[${extensionName}] ✅ Loaded successfully`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Failed to load:`, error);
    }
});
