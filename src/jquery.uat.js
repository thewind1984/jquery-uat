/**
 * @name jQuery.UAT
 * @summary Plugin for UAT (User Acceptance Testing) of pages
 * @author thewind <thewind05@gmail.com>
 * @version 1.0
 * @pubdate: 2018-06-19
 *
 * @todo
 * - date format (d.m.Y H:i:s:ms)
 * - test creation window
 * - adjust UAT window height by mouse moving
 *
 * - implement methods:
 * ++ setCookie (add prefix for name and remove cookie after finishing tests; also remove all cookies with prefix at the start of script)
 * ++ removeCookie
 * -- redirectTo(pageURL: string)
 * ++ scrollToObj(selector: string)
 * ++ clickBy(selector: string)
 * ++ wait(milliSeconds: number)
 * -- waitFor(testName: string, selector: string, breakMs: number)
 * -- fillIn(selector: string, value: string|array)
 * -- countObjects(selector: string)
 *
 * - implement test
 * ++ hasCookie
 * ++ isObjVisible
 * ++ hasJsVariable
 * ++ valueEqualsTo
 *
 * - store data in localStorage
 * - show data from localStorage after redirection
 */
(function($){
    $.fn.uat = function(settings){
        var defaultOutput = 'console';

        settings = typeof settings == 'object' ? settings : {};
        settings = $.extend({}, {
            obj: null,      // current obj for running tests
            step_by_step: false,        // use spacebar for moving to next step ('true' works only if output == 'window')
            break_on_error: false,      // break tests on first error
            timeout: 0,      // milliseconds
            output: defaultOutput,      // where to output results (console || window)
            debug: false,       // TODO: add output lines for debug
        }, settings, {obj: this});
        
        settings.timeout = !isNaN(parseFloat(settings.timeout)) && parseFloat(settings.timeout) > 0 ? parseFloat(settings.timeout) : 0;
        settings.output = $.inArray(settings.output, ['console', 'window']) == -1 ? defaultOutput : settings.output;
        
        /**
         * pageURL
         * date
         * testName
         * passed
         * resultType
         * result
         */
        var tests = [];
        var lastFoundObj = false;
        var currentLocation = location.href;
        var tempLocation = currentLocation;
        var testLocationPage = null;
        var started = false;
        var bodyMarginBottom = parseFloat($('body').css('margin-bottom'));
        var logScope = [];
        
        // private
        function init(){
            console.clear();                // clear console
            saveSettings.call(this);        // save current settings into storage
            $.fn.uat.view.call(this);       // prepare output
            listeners.call(this);           // setup event listeners
            initStorage.call(this);         // run tests from storage
            return this;
        }
        
        function listeners(){
            if ($.fn.uat.instance.call(this)) {
                return;
            }
            var that = this;
            $(settings.obj).on('uatqueue', function(e){
                runQueue.call(that);
            });
        }

        function saveSettings(){
            $.fn.uat.storage.call(this, 'set', 'settings', settings);
        }
        
        function initStorage(){
            var storedTests = $.fn.uat.storage.call(this, 'get', 'tests');
            if (typeof storedTests != 'undefined' && storedTests !== null && storedTests.length) {
                $.fn.uat.instance.call(this, 'set');
                tests = storedTests;
                var testNum = 0;
                while (tests[testNum].passed) {
                    var test = tests[testNum];
                    if (testLocationPage !== test.page) {
                        $.fn.uat.log.call(this, null, '--- page', test.page);
                        testLocationPage = test.page;
                    }
                    // console.log('testNum', testNum + ' - passed');
                    $.fn.uat.log.call(this, test.result.type, test.name + ' test: ' + $.fn.uat.args.call(this, test.args), test.result.result);
                    testNum++;
                }
                this.run();
            }
        }
        
        // visible only from this
        sleep = function(ms) {
            var date = new Date();
            var curDate = null;
            do { curDate = new Date(); }
            while(curDate-date < ms);
        }
        
        // visible from this and from childs
        testFinished = function(type, resultData){
            if (type == 'unit') {
                if (lastFoundObj !== false) {
                    $.fn.uat.log.call(this, 'info', 'break branch to root', true);
                }
                lastFoundObj = false;
            }
            var testNum = $.fn.uat.storage.call(this, 'get', 'testNum');
            tests[testNum].result = resultData;
            tests[testNum].passed = 1;
            $.fn.uat.storage.call(this, 'set', 'tests', tests);
            $.fn.uat.storage.call(this, 'set', 'testNum', testNum + 1);
            if (settings.timeout) {
                $.fn.uat.log.call(this, null, '--- timeout', settings.timeout + 'sec');
                sleep(settings.timeout * 1000)
            }
            return resultData.action || this;
        }

        resultation = function(){
            var types = {};
            $(tests).each(function(){
                if (this.passed == 1) {
                    if (typeof types[this.result.type] == 'undefined') {
                        types[this.result.type] = 0;
                    }
                    types[this.result.type]++;
                }
            });
            var types2 = [];
            $.each(types, function(type, count){
                types2.push(type + ': ' + count);
            });
            $.fn.uat.log.call(this, null, '--- tests finished', types2.join(', '));
            //console.log(JSON.stringify($.fn.uat.storage.call(this, 'get', 'tests')));
            $.fn.uat.storage.call(this, 'set', 'tests', null);      // clean
            $.fn.uat.storage.call(this, 'set', 'settings', {});   // clean
            $.fn.uat.storage.call(this, 'set', 'testNum', 0);    // clean
            $.fn.uat.instance.call(this, 'del');
            return this;
        }
        
        // visible everywhere, even outside
        getLastFoundObj = function(){
            return lastFoundObj;
        }
        
        setLastFoundObj = function(obj){
            lastFoundObj = obj;
        }
        
        getSettings = function(){
            return settings;
        }

        getBodyMarginBottom = function(){
            return bodyMarginBottom;
        }

        addLogScope = function(data){
            logScope.push(data);
        }

        getLogScope = function(){
            return logScope;
        }
        
        function addUnit(testName, args){
            return addIteration.call(this, 'unit', testName, args);
        }

        function addStep(stepName, args){
            return addIteration.call(this, 'step', stepName, args);
        }

        function addIteration(type, name, args){
            if ($.fn.uat.instance.call(this)) {
                console.log('skip adding ' + type + ' (' + name + ')');
                return this;
            }
            tests.push({
                type: type,
                name: name,
                args: args || [],
                passed: 0,
                date: null,
                result: null,
                page: tempLocation,
            });
            return this;
        }

        function runQueue(){
            var testNum = $.fn.uat.storage.call(this, 'get', 'testNum') || 0;
            if (testNum >= tests.length) {
                // console.log(testNum + ' <=> ' + tests.length);
                return resultation.call(this);
            }
            var test = tests[testNum];
            if (!started) {
                $.fn.uat.log.call(this, null, '--- page', test.page);
                started = new Date();
            }
            // console.log('testNum', testNum);
            if (typeof test.page == 'undefined' || test.page !== currentLocation) {
                return this;
            }
            test.date = new Date();
            var itemResult = $.fn.uat[test.type].call(this, test.name, test.args);
            if (typeof itemResult !== 'string') {
                this.run();
            } else {
                switch (itemResult) {
                    case 'stop':
                        // console.log('stop after item');
                        break;
                }
            }
        }
        
        // public test
        this.contains = function(selector){
            return addUnit.call(this, 'contains', [selector]);
        }
        
        // public test
        this.notContains = function(selector){
            return addUnit.call(this, 'notContains', [selector]);
        }
        
        // public test
        this.hasCookie = function(cookieName){
            return addUnit.call(this, 'hasCookie', [cookieName]);
        }
        
        // public test
        this.isObjVisible = function(selector){
            return addUnit.call(this, 'isObjVisible', [selector]);
        }

        // public test
        this.hasJsVariable = function(variableName){
            return addUnit.call(this, 'hasJsVariable', [variableName]);
        }

        // public test
        this.valueEqualsTo = function(selector, value){
            return addUnit.call(this, 'valueEqualsTo', [selector, value]);
        }
        
        // public step
        this.findObj = function(selector){
            return addStep.call(this, 'findObj', [selector]);
        }
        
        // public step
        this.setCookie = function(cookieName, cookieValue){
            return addStep.call(this, 'setCookie', [cookieName, cookieValue]);
        }

        // public step
        this.removeCookie = function(cookieName){
            return addStep.call(this, 'removeCookie', [cookieName]);
        }
        
        // public step
        this.redirectTo = function(url){
            url = $.trim(url);
            if (url !== tempLocation) {
                var result = addStep.call(this, 'redirectTo', [url]);
                tempLocation = url;
                return result;
            }
        }
        
        // public step
        this.clickBy = function(selector){
            return addStep.call(this, 'clickBy', [selector]);
        }
        
        // public step
        this.wait = function(ms){
            return addStep.call(this, 'wait', [ms]);
        }
        
        // public step
        this.waitFor = function(testName, selector, timeout){
            
        }
        
        // public step
        this.fillIn = function(selector, value){
            
        }
        
        // public step
        this.scrollToObj = function(selector, extra){
            return addStep.call(this, 'scrollToObj', [selector, extra]);
        }

        // run all steps
        this.finish = function(){
            if ($.fn.uat.instance.call(this)) {
                return this;
            }
            $.fn.uat.storage.call(this, 'set', 'tests', tests);
            this.run();
        }

        this.run = function(){
            setTimeout(function(){
                $(settings.obj).trigger('uatqueue');
            }, started ? settings.timeout * 1000 : 50);
        }

        return init.call(this);
    }

    $.fn.uat.args = function(args){
        var argsList = [];
        $(args).each(function(){
            argsList.push(this.toString());
        });
        return argsList.join(', ');
    }
    
    /**
     * Unit test constructor
     */
    $.fn.uat.unit = function(testName, testArgs){
        var resultData = $.fn.uat.unit[testName].apply(this, testArgs);
        $.fn.uat.log.call(this, resultData.type, testName + ' test: ' + $.fn.uat.args.call(this, testArgs), resultData.result);
        return testFinished.call(this, 'unit', resultData);
    }
    
    /**
     * TEST: contains
     */
    $.fn.uat.unit.contains = function(selector){
        var result = (getLastFoundObj() || $(getSettings().obj)).find(selector).length ? true : false;
        return {type: result ? 'success' : 'error', result: result};
    }
    
    /**
     * TEST: notContains
     */
    $.fn.uat.unit.notContains = function(selector){
        var result = !(getLastFoundObj() || $(getSettings().obj)).find(selector).length ? true : false;
        return {type: result ? 'success' : 'error', result: result};
    }

    /**
     * TEST: hasCookie
     */
    $.fn.uat.unit.hasCookie = function(cookieName){
        var result = new RegExp('(^|; )' + cookieName.toString() + '=([^;$]*)', 'gi').exec(document.cookie);
        return {type: result != null ? 'success' : 'error', result: result != null ? (result[2] !== '' ? result[2] : '[EMPTY VALUE]') : false};
    }

    /**
     * TEST: isObjVisible
     * TODO: improve method, if object is inherit into visible, but scrollable object (parent is visible, but child - not)
     */
    $.fn.uat.unit.isObjVisible = function(selector){
        var obj = $(selector),
            objTop = obj.offset().top,
            objHeight = obj.outerHeight(),
            objTopHeight = objTop + objHeight,
            fullHeight = $(window).outerHeight() + $(window).scrollTop(),
            result = objTop < fullHeight,
            visibilityPercentage = !result ? 0 : (objTopHeight <= fullHeight ? 100 : (objHeight - (objTopHeight - fullHeight)) / objHeight * 100);
        return {type: result ? 'success' : 'error', result: (result ? 'true' : 'false') + ' (' + visibilityPercentage + '%)'};
    }

    /**
     * TEST: hasJsVariable
     */
    $.fn.uat.unit.hasJsVariable = function(variableName){
        var result = typeof window[variableName] != 'undefined';
        return {type: result ? 'success' : 'error', result: result ? window[variableName].toString() : false};
    }

    /**
     * TEST: valueEqualsTo
     */
    $.fn.uat.unit.valueEqualsTo = function(selector, value){
        var obj = $(selector);
        if (obj.length) {
            var fieldName = obj.attr('name') || null,
                similarObjects = fieldName ? $('[name="' + fieldName + '"]') : [],
                hasMultiFields = fieldName ? similarObjects.length > 1 : false,
                instances = hasMultiFields ? similarObjects : obj,
                values = [];
            $(instances).each(function(){
                var tagName = this.tagName.toLowerCase(),
                    objType = $(this).attr('type') || null;
                switch (tagName) {
                    case 'input':
                        if ($.inArray(objType, ['checkbox', 'radio']) != -1) {
                            $($(this).filter(':selected')).each(function(){
                                values.push(this.value);
                            });
                        } else {
                            values.push(this.value);
                        }
                    case 'button':
                    case 'textarea':
                        values.push(this.value);
                        break;
                    case 'select':
                        $($(this).find('option:selected')).each(function(){
                            values.push(this.value);
                        });
                        break;
                }
            });
            var result = $.inArray(value, values) != -1;
            return {type: result ? 'success' : 'error', result: result};
        }
        return {type: 'error', result: 'object not found'};
    }

    /**
     * Move testContainer to another step (another object, redirect to page)
     */
    $.fn.uat.step = function(testName, testArgs){
        var resultData = $.fn.uat.unit[testName].apply(this, testArgs);
        $.fn.uat.log.call(this, resultData.type, testName + ' test: ' + $.fn.uat.args.call(this, testArgs), resultData.result);
        return testFinished.call(this, 'step', resultData);
    }
    
    /**
     * STEP: findObj
     */
    $.fn.uat.unit.findObj = function(selector){
        setLastFoundObj( $(getSettings().obj).find(selector) );
        if (!getLastFoundObj().length) {
            return {type: 'warning', result: false};
        }
        return {type: 'success', result: true};
    }

    /**
     * STEP: setCookie
     */
    $.fn.uat.unit.setCookie = function(cookieName, cookieValue){
        document.cookie = cookieName + '=' + cookieValue.toString();
        return {type: 'success', result: true};
    }

    /**
     * STEP: removeCookie
     */
    $.fn.uat.unit.removeCookie = function(cookieName){
        document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        return {type: 'success', result: true};
    }

    /**
     * STEP: scrollToObj
     */
    $.fn.uat.unit.scrollToObj = function(selector, extra){
        $('html,body').scrollTop($(selector).offset().top + parseInt(extra || 0));
        return {type: 'success', result: 'scrollTop: ' + $(window).scrollTop()};
    }

    /**
     * STEP: clickBy
     */
    $.fn.uat.unit.clickBy = function(selector){
        $(selector).trigger('click');
        return {type: 'success', result: true};
    }

    /**
     * STEP: wait
     */
    $.fn.uat.unit.wait = function(ms){
        sleep.call(this, ms);
        return {type: 'success', result: true};
    }

    /**
     * STEP: redirectTo
     */
    $.fn.uat.unit.redirectTo = function(url){
        location.href = url;
        return {type: 'success', result: true, action: 'stop'};
    }

    /**
     * Browser view of tests
     * Tests creation, results of tests
     */
    $.fn.uat.view = function(method, args){
        var selectors = {
            window: '#uat_window',
            tests: '#uat_block',
            help: '#uat_help',
            create: '#uat_create',
            result: '#uat_result',
            mouseMover: '#uat_mouse_mover',
            mouseResizer: '#uat_mouse_resize',
        }
        var defaultOpacity = .3;
        var that = this;
        var initialState = {width: 'calc(100% - 20px)', height: '300px', left: '10px', top: 'auto', bottom: '5px'};

        this.mouseIsDown = false;
        this.mouseObj = null;
        this.mousePosition = {x: 0, y: 0};
        
        function saveWindowState(){
            var mainDiv = $(selectors.window);
            mainDiv.css({
                bottom: 'auto',
                top: mainDiv.position().top + 'px'
            });
            validateWindowState.call(this);
            mainDiv.data({
                offset: mainDiv.position(),
                width: mainDiv.outerWidth(),
                height: mainDiv.outerHeight()
            });
        }
        
        function restate(){
            $(selectors.window).css(initialState);
            saveWindowState.call(this);
            $.fn.uat.storage.call(this, 'set', 'window', null);
        }
        
        function validateWindowState(){
            var obj = $(selectors.window),
                pos = obj.position(),
                leftMax = document.body.clientWidth - obj.outerWidth(),
                topMax = document.body.clientHeight - obj.outerHeight();
            if (pos.left < 0) {
                obj.css('left', 0);
            } else if (pos.left > leftMax) {
                obj.css('left', leftMax);
            }
            if (pos.top < 0) {
                obj.css('top', 0);
            } else if (pos.top > topMax) {
                obj.css('top', topMax);
            }
        }
        
        function storeWindowState(){
            var _obj = $(selectors.window);
            $.fn.uat.storage.call(this, 'set', 'window.position.left', _obj.data('offset').left + 'px');
            $.fn.uat.storage.call(this, 'set', 'window.position.top', _obj.data('offset').top + 'px');
            $.fn.uat.storage.call(this, 'set', 'window.dimension.width', _obj.data('width') + 'px');
            $.fn.uat.storage.call(this, 'set', 'window.dimension.height', _obj.data('height') + 'px');
        }

        function draw(){
            if ($(selectors.window).length) {
                var mainDiv = $(selectors.window);
                mainDiv.toggle();
            } else {
                var
                    unSelectableCSS = {'-moz-user-select': '-moz-none', '-khtml-user-select': 'none', '-webkit-user-select': 'none', '-ms-user-select': 'none', 'user-select': 'none'},
                    blockCSS = {border: '1px solid #333', borderRadius: '4px', padding: '10px'},
                    flexCSS = {display: 'flex', flexDirection: 'row'},
                    flexColumnCSS = {flexDirection: 'column'},
                    scrollableCSS = {overflow: 'auto', overflowX: 'inherit'};

                var windowLeft = $.fn.uat.storage.call(this, 'get', 'window.position.left'),
                    windowTop = $.fn.uat.storage.call(this, 'get', 'window.position.top'),
                    windowWidth = $.fn.uat.storage.call(this, 'get', 'window.dimension.width'),
                    windowHeight = $.fn.uat.storage.call(this, 'get', 'window.dimension.height');

                var mainDiv = $('<div>')
                    .attr({id: selectors.window.replace('#', '')})
                    .css($.extend({}, unSelectableCSS, flexCSS, {
                        position: 'fixed',
                        left: windowLeft || initialState.left,
                        width: windowWidth || initialState.width,
                        height: windowHeight || initialState.height,
                        background: '#f1f1f1',
                        color: '#000',
                        fontSize: '12px',
                        fontFamily: 'Arial',
                        fontWeight: 'normal',
                        fontStyle: 'normal',
                        padding: '10px',
                        paddingTop: '16px',
                        margin: 0,
                        boxSizing: 'border-box',
                        border: '2px solid #bbb',
                        borderRadius: '6px',
                        justifyContent: 'space-between',
                        opacity: defaultOpacity,
                        minHeight: '100px',
                        minWidth: '522px',
                        transition: 'opacity .3s',
                    }))
                    .css(typeof windowTop === 'undefined' ? 'bottom' : 'top', windowTop || initialState.bottom)
                    .appendTo('body');

                saveWindowState.call(this);

                var moverDiv = $('<div>')
                    .attr({id: selectors.mouseMover.replace('#', ''), title: 'Move UAT window by moving this bar', 'data-obj': 'mover'})
                    .css($.extend({}, blockCSS, {padding: 0, position: 'absolute', left: '2px', top: '2px', width: 'calc(100% - 4px)', height: '0', borderWidth: '3px', background: '#333', cursor: 'move'}))
                    .appendTo(mainDiv);

                var resizerDiv = $('<div>')
                    .attr({id: selectors.mouseResizer.replace('#', ''), title: 'Resize UAT window by moving this corner', 'data-obj': 'resizer'})
                    .css($.extend({}, blockCSS, {padding: 0, position: 'absolute', bottom: '2px', right: '2px', width: '20px', height: '20px', border: '3px solid #333', borderTop: 0, borderLeft: 0, cursor: 'se-resize'}))
                    .appendTo(mainDiv);

                var testDiv = $('<div>')
                    .attr({id: selectors.tests.replace('#', '')})
                    .css($.extend({}, flexCSS, flexColumnCSS, {width: '100%', marginRight: '10px'}))
                    .appendTo(mainDiv);

                /*var testCreateDiv = $('<div>')
                    .attr({id: selectors.create.replace('#', '')})
                    .css($.extend({}, blockCSS, {marginBottom: '10px', height: '200px', maxHeight: '30%'}))
                    .appendTo(testDiv);*/

                var testResultDiv = $('<div>')
                    .attr({id: selectors.result.replace('#', '')})
                    .css($.extend({}, blockCSS, {height: '100%'}, scrollableCSS))
                    .appendTo(testDiv);

                var helpDiv = $('<div>')
                    .attr({id: selectors.help.replace('#', '')})
                    .css($.extend({}, blockCSS, {width: '100%', maxWidth: '300px'}, scrollableCSS))
                    .append('<div style="margin-bottom:10px;"><div style="float:right;"><b>Ctrl + Alt + U</b></div><div>Show / hide UAT window</div><div style="font-size:11px;margin-top:4px;">If init option <i>output</i> equals to <i>window</i>, it will be showen automatically.<div></div>')
                    .append('<div style="margin-bottom:10px;"><div style="float:right;"><b>Ctrl + Alt + R</b></div><div>Restore UAT window to initial state</div><div style="font-size:11px;margin-top:4px;">Full width, sticked to bottom of the window</div></div>')
                    .appendTo(mainDiv);

                this.showResults('window');
            }
        }

        function keyboardListener(){
            $('body')
                .on('mouseover touchstart', selectors.window, function(){ $(this).css('opacity', 1); })
                .on('mouseout touchend', selectors.window, function(){ $(this).css('opacity', defaultOpacity); });

            $('body')
                .on('mousedown touchstart', selectors.mouseMover + ',' + selectors.mouseResizer, function(e){
                    that.mouseIsDown = true;
                    that.mouseObj = $(this);
                    that.mousePosition.x = e.type == 'mousedown' ? e.clientX : e.touches[0].clientX;
                    that.mousePosition.y = e.type == 'mousedown' ? e.clientY : e.touches[0].clientY;
                    $(this).data('border', $(this).css('border-color'));
                    $(this).css('border-color', 'red');
                });

            $(window)
                .on('keydown', function(e){
                    if (!(e.ctrlKey && e.altKey)) {
                        return;
                    }
                    switch (e.keyCode) {
                        case 85:        // U
                            draw.call(that);
                            break;
                        case 82:        // R
                            restate.call(that);
                            break;
                    }
                })
                .on('resize', function(e){
                    validateWindowState();
                    saveWindowState();
                    storeWindowState();
                })
                .on('mouseup touchend', function(){
                    that.mouseIsDown = false;
                    if (that.mouseObj !== null) {
                        that.mouseObj.css('border-color', that.mouseObj.data('border'));
                    }
                })
                .on('mousemove touchmove', function(e){
                    if (that.mouseIsDown) {
                        var x = e.type == 'mousemove' ? e.clientX : e.changedTouches[0].clientX,
                            y = e.type == 'mousemove' ? e.clientY : e.changedTouches[0].clientY,
                            mouseDiff = {x: x - that.mousePosition.x, y: y - that.mousePosition.y};
                        that.mousePosition.x = x;
                        that.mousePosition.y = y;
                        
                        var _obj = $(selectors.window);

                        switch (that.mouseObj.data('obj')) {
                            case 'mover':
                                var left = _obj.data('offset').left + mouseDiff.x,
                                    top = _obj.data('offset').top + mouseDiff.y;
                                if (left < 0 || left > document.body.clientWidth - _obj.outerWidth() || top < 0 || top > document.body.clientHeight - _obj.outerHeight()) {
                                    break;
                                }
                                _obj.data('offset', {
                                    left: left,
                                    top: top
                                });
                                _obj.css({
                                    left: _obj.data('offset').left + 'px',
                                    top: _obj.data('offset').top + 'px'
                                });
                                break;
                            
                            case 'resizer':
                                _obj.data({
                                    width: _obj.data('width') + mouseDiff.x,
                                    height: _obj.data('height') + mouseDiff.y
                                });
                                _obj.css({
                                    width: _obj.data('width') + 'px',
                                    height: _obj.data('height') + 'px'
                                });
                                break;
                        }
                        storeWindowState();
                    }
                });
        }

        this.showResults = function(output){
            $.fn.uat.log.call(this, output);
        }

        this.addLine = function(key, value, style){
            var id = 'uat_result_item_' + Math.random() * 100000;
            var resultBlock = $(selectors.result);
            $('<div>')
                .attr({style: style, id: id})
                .html(key + ': ' + value)
                .appendTo(resultBlock);
            resultBlock.animate({scrollTop: resultBlock.prop("scrollHeight")}, 500);
        }
        
        this.init = function(){
            if (getSettings().output === 'window') {
                draw.call(this);
            }
            keyboardListener();
        }

        this[method || 'init'].apply(this, args || []);
    }
    
    /**
     * Outputs log data to console
     */
    $.fn.uat.log = function(type, key, value){
        var color = 'black';

        switch (type) {
            case 'error':
                color = 'red';
                break;
            case 'success':
                color = 'green';
                break;
            case 'warning':
                color = 'orange';
                break;
            case 'info':
                color = 'blue';
                break;
        }
        
        function write(key, value, color){
            addLogScope([key, value, color]);
            show.call(this, key, value, color, getSettings().output);
        }

        function show(key, value, color, output){
            var style = 'color:' + color;
            value = typeof value == 'undefined' ? '' : value;

            if (output == 'console') {
                console.log('%c' + key, style, value);
            } else {
                $.fn.uat.view.call(this, 'addLine', [key, value, style]);
            }
        }

        function showIn(output){
            var scope = getLogScope();
            for (var s=0; s<scope.length; s++) {
                var lineData = scope[s];
                lineData.push(output);
                show.apply(this, lineData);
            }
        }

        switch (type) {
            case 'window':
            case 'console':
                showIn.call(this, type);
                break;

            default:
                write.call(this, (typeof type != 'undefined' && type != null ? '[' + (new Date().toLocaleString()) + '] [' + type.toUpperCase() + '] ' : '') + key, value, color);
        }
    }

    /**
     * Storage
     */
    $.fn.uat.storage = function() {
        var uatObjectDist = {
            window: {
                position: {
                    left: 0,
                    top: 0,
                },
                dimension: {
                    width: 0,
                    height: 0,
                },
            },
            settings: {},
            tests: [],
            testNum: 0,
        }

        var storageKey = 'uat_object';

        this.set = function(key, value) {
            var uatObject = this.object() || uatObjectDist;
            var obj = this.prepareObjFromKey(key, value);
            this.object($.extend(true, {}, uatObject, obj));
        }

        this.get = function(key) {
            var uatObject = this.object() || {};
            key = key.split('.');
            while((_key = key.shift())) {
                if (typeof uatObject[_key] === 'undefined' || uatObject[_key] === null) {
                    return;
                }
                uatObject = uatObject[_key];
            }
            return uatObject;
        }

        /**
         * TODO: storageFactory - using cookies || localStorage
         */
        this.object = function(arg){
            if (typeof arg === 'undefined') {
                var obj = localStorage.getItem(storageKey);
                return typeof obj === 'undefined' ? obj : JSON.parse(obj);
            } else {
                localStorage.setItem(storageKey, JSON.stringify(arg));
            }
        }

        this.prepareObjFromKey = function(key, value) {
            key = key.split('.');
            var realKey = key.pop(), obj =  tempObj = {};
            while ((_key = key.shift())) {
                tempObj = tempObj[_key] = {};
            }
            tempObj[realKey] = value;
            return obj;
        }

        if (typeof arguments != 'undefined' && arguments.length) {
            return this[arguments[0]].apply(this, Array.from(arguments).slice(1));
        }
    }
    
    /**
     * Singleton pattern of class
     */
    $.fn.uat.instance = function(method){
        this.check = function(){
            return typeof $(document).data('uat') !== 'undefined';
        }
        
        this.set = function(){
            $(document).data('uat', true);
        }
        
        this.del= function(){
            $(document).removeData('uat');
        }
        
        this[method||'check'].call(this);
    }

    // initial of plugin automatically
    $(document).ready(function(e){
        var tests = $.fn.uat.storage.call(this, 'get', 'tests');
        if (typeof tests != 'undefined' && tests !== null && tests.length) {
            var settings = $.fn.uat.storage.call(this, 'get', 'settings'),
                obj = settings.obj;

            $.each(settings, function(k, v){
                if (k === 'obj') {
                    delete settings[k];
                }
            });

            $(document).uat(settings);
        }
    });
}(jQuery));
