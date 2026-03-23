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
    let dragStartTime = 0;
    let offsetX = 0, offsetY = 0;
    let startX = 0, startY = 0;
    let isDraggingCube = false; // Флаг что тащим именно кубик

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

    // Обработчик начала перетаскивания - ТОЛЬКО если target сам кубик
    function onDragStart(e) {
        // Игнорируем правую кнопку мыши
        if (e.button === 2) return;
        
        // Получаем реальный target (для touch нужно из touches)
        let target = e.target;
        if (e.type === 'touchstart' && e.touches) {
            const touch = e.touches[0];
            target = document.elementFromPoint(touch.clientX, touch.clientY);
        }
        
        // ВАЖНО: перетаскиваем ТОЛЬКО если кликнули прямо по кубику или его содержимому
        const $target = $(target);
        if (!$target.closest('#tbc-cube').length) {
            // Клик не по кубику - игнорируем
            return;
        }
        
        // Проверяем, не кликнули ли по интерактивному элементу внутри кубика
        if ($target.closest('button, .tbc-panel-btn, .menu_button, input, select').length) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation(); // Останавливаем всплытие
        
        dragging = true;
        isDraggingCube = true;
        didDrag = false;
        dragStartTime = Date.now();
        
        const coords = getClientCoords(e);
        startX = coords.clientX;
        startY = coords.clientY;
        offsetX = startX - parseInt(cube.css("left"));
        offsetY = startY - parseInt(cube.css("top"));
        
        cube.addClass("tbc-dragging");
        
        // Блокируем скролл на мобильных
        if (e.type === 'touchstart') {
            setDraggingActive(true);
        }
    }

    // Обработчик перемещения
    function onDragMove(e) {
        if (!dragging || !isDraggingCube) return;
        
        e.preventDefault();
        
        const coords = getClientCoords(e);
        const deltaX = Math.abs(coords.clientX - startX);
        const deltaY = Math.abs(coords.clientY - startY);
        
        // Если переместились больше чем на 5 пикселей - считаем что это перетаскивание
        if (!didDrag && (deltaX > 5 || deltaY > 5)) {
            didDrag = true;
        }
        
        if (didDrag) {
            const cw = cube.outerWidth(), ch = cube.outerHeight();
            const pos = clampToScreen(coords.clientX - offsetX, coords.clientY - offsetY, cw, ch);
            
            cube.css({ left: pos.x, top: pos.y });
            panel.css({ left: pos.x, top: pos.y + ch + 6 });
        }
    }

    // Обработчик окончания перетаскивания
    function onDragEnd(e) {
        if (!dragging) return;
        
        dragging = false;
        cube.removeClass("tbc-dragging");
        setDraggingActive(false);
        
        // Если было перетаскивание - сохраняем позицию
        if (didDrag) {
            savePosition(parseInt(cube.css("left")), parseInt(cube.css("top")));
        }
        
        // Сбрасываем флаги с задержкой
        setTimeout(() => {
            isDraggingCube = false;
            didDrag = false;
        }, 100);
    }

    // Обработчик клика (открытие панели) - только если не было перетаскивания
    function onCubeClick(e) {
        // Если было перетаскивание или тащим не кубик - игнорируем
        if (didDrag || !isDraggingCube) {
            e.stopPropagation();
            e.preventDefault();
            return;
        }
        
        // Для touch-событий проверяем, не было ли долгого нажатия
        const pressDuration = Date.now() - dragStartTime;
        if (pressDuration > 200 && pressDuration < 500) {
            return;
        }
        
        e.stopPropagation();
        
        const isOpen = cube.hasClass("tbc-open");
        cube.toggleClass("tbc-open", !isOpen);
        panel.toggleClass("tbc-panel-open", !isOpen);
        if (!isOpen) renderCubePanel();
    }

    // Mouse events
    cube.off("mousedown").on("mousedown", onDragStart);
    $(document).off("mousemove.tbc").on("mousemove.tbc", onDragMove);
    $(document).off("mouseup.tbc").on("mouseup.tbc", onDragEnd);
    cube.off("click").on("click", onCubeClick);
    
    // Touch events для мобильных - используем capture фазу для приоритета
    cube.off("touchstart").on("touchstart", function(e) {
        // Проверяем, что touch начался именно на кубике
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if ($(target).closest('#tbc-cube').length) {
            onDragStart(e);
        }
    });
    
    $(document).off("touchmove.tbc").on("touchmove.tbc", onDragMove);
    $(document).off("touchend.tbc").on("touchend.tbc", onDragEnd);
    $(document).off("touchcancel.tbc").on("touchcancel.tbc", onDragEnd);
    
    // Отдельный обработчик для клика на кубик через touchend
    cube.off("touchend").on("touchend", function(e) {
        // Небольшая задержка, чтобы убедиться что не было перетаскивания
        setTimeout(() => {
            if (!didDrag && isDraggingCube) {
                onCubeClick(e);
            }
        }, 50);
    });

    // Закрытие панели при клике вне
    function closePanel(e) {
        const $target = $(e.target);
        if (!$target.closest("#tbc-cube, #tbc-panel").length) {
            setTimeout(() => {
                cube.removeClass("tbc-open");
                panel.removeClass("tbc-panel-open");
            }, 150);
        }
    }
    
    $(document).off("click.tbc-outside").on("click.tbc-outside", closePanel);
    $(document).off("touchstart.tbc-outside").on("touchstart.tbc-outside", closePanel);

    cube.off("contextmenu").on("contextmenu", function (e) {
        e.preventDefault(); 
        resetAll();
    });

    applyHiddenState();
    console.log(`[${extensionName}] 🎲 Cube created with improved touch handling`);
}
