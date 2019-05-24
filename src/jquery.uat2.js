/**
 * @name jQuery.UAT v2
 * @summary Plugin for UAT (User Acceptance Testing) of pages
 * @author thewind <thewind05@gmail.com>
 * @version 2.0
 * @pubdate: 2018-06-19
 */
(function($){
    $.fn.uat = function(settings){
        var defaultOutput = 'console';

        var options = $.extend({}, {
            obj: 'body',      // current obj for running tests
            step_by_step: false,        // use spacebar for moving to next step ('true' works only if output == 'window')
            break_on_error: false,      // break tests on first error
            timeout: 0,      // milliseconds
            output: defaultOutput,      // where to output results (console || window)
            debug: false,       // TODO: add output lines for debug
        }, typeof settings === 'object' ? settings : {});

        options.timeout = !isNaN(parseFloat(options.timeout)) && parseFloat(options.timeout) > 0 ? parseFloat(options.timeout) : 0;
        options.output = $.inArray(options.output, ['console', 'window']) === -1 ? defaultOutput : options.output;

        var isFrame = window.top !== window.self,
            tests = [],
            lastFoundObj = false,
            tempLocation = location.href,
            lastTestPage = null,
            logScope = [],
            started = false,
            isRedirected = false,
            redirectionLabel = null,
            isPaused = false,
            testInProcess = false,
            isLastTest = false,
            frameLoadedTimes = 0;

        function init(){
            $('body').html('<iframe id="source_site_iframe" sandbox="allow-same-origin allow-scripts" style="position:absolute;left:0;top:0;width:100%;height:100%;border:0;" src="' + location.href + '" onload="uatObj.frameLoaded();"></iframe><div id="iframe_loader" style="position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:2;display:flex;align-items:center;justify-content:center;font-size:50px;font-weight:bold;text-shadow:1px 1px 5px #fff;display:none;">Redirection...</div>');
            $.fn.uat.view.call(this);
        }

        this.frameLoaded = function () {
            if (frameLoadedTimes > 0) {
                $('#source_site_iframe').css('filter', 'none');
                $('#iframe_loader').hide();
                $('body').trigger('uatqueue');
            }
            frameLoadedTimes++;
        }

        function listeners(){
            var that = this;

            window.addEventListener('message', function(e){
                var data = JSON.parse(e.data),
                    command = data.command || null;

                switch (command) {
                    // command from parent to iframe with test data
                    // iframe runs the test and sends the result back with `receiveTestResult` command
                    case 'runTest':
                        var testResult = runTest(data.test);
                        parent.postMessage(JSON.stringify({command: 'receiveTestResult', test: data.test, result: testResult, location: data.test.name === 'redirectTo' ? data.test.args[0] : data.test.page}), e.origin);
                        break;

                    // command received by parent with the result of test
                    case 'receiveTestResult':
                        var receivedResult = receiveTestResult(data.test, data.result);
                        lastTestPage = data.location;
                        testInProcess = false;
                        if (isLastTest) {
                            resultation();
                            break;
                        }
                        if (typeof receivedResult !== 'string') {
                            run();
                        } else {
                            switch (receivedResult) {
                                case 'redirect':
                                    isRedirected = true;
                                    redirectionLabel = data.test.args[1];
                                    $.fn.uat.log.call(this, null, '--- redirection...');
                                    break;
                            }
                        }
                        break;

                    case 'frameReady':
                        if (isRedirected) {
                            isRedirected = false;
                            run();
                        }
                        break;
                }
            }, false);

            $('body').on('uatqueue', function (e) {
                runQueue.call(that);
            });
        }

        getOptions = function(){
            return options;
        }

        getLogScope = function(){
            return logScope;
        }

        addLogScope = function(data){
            logScope.push(data);
        }

        getLastFoundObj = function(){
            return lastFoundObj;
        }

        setLastFoundObj = function(obj){
            lastFoundObj = obj;
        }

        togglePause = function(){
            isPaused = !isPaused;
        }

        getIsPaused = function(){
            return isPaused;
        }

        getTestInProcess = function(){
            return testInProcess;
        }

        finishAfterCurrent = function(){
            isLastTest = true;
        }

        isStarted = function(){
            return started;
        }

        // visible only from this
        sleep = function(ms) {
            var date = new Date();
            var curDate = null;
            do { curDate = new Date(); }
            while(curDate-date < ms);
        }

        setCounter = function(type, value) {
            var counterObj = $('[data-tests="' + type + '"] b');
            counterObj.text(value);
        }

        addCounter = function(type, add) {
            var counterObj = $('[data-tests="' + type + '"] b'),
                counterValue = parseInt(counterObj.text()) + parseInt(add);
            setCounter(type, counterValue);
        }

        // visible from this and from childs
        testFinished = function(type, resultData){
            var testNum = $.fn.uat.storage.call(this, 'get', 'testNum');
            tests[testNum].result = resultData;
            tests[testNum].passed = 1;
            $.fn.uat.storage.call(this, 'set', 'tests', tests);
            $.fn.uat.storage.call(this, 'set', 'testNum', testNum + 1);

            addCounter(resultData.type, 1);

            if (options.timeout) {
                $.fn.uat.log.call(this, null, '--- timeout', options.timeout + 'sec');
                sleep(options.timeout * 1000)
            }
            return resultData.action || this;
        }

        resultation = function(){
            var types = {};
            $(tests).each(function(){
                if (this.passed === 1) {
                    if (typeof types[this.result.type] === 'undefined') {
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
            $.fn.uat.storage.call(this, 'set', 'tests', null);      // clean
            $.fn.uat.storage.call(this, 'set', 'settings', {});   // clean
            $.fn.uat.storage.call(this, 'set', 'testNum', 0);    // clean
            lastFoundObj = false;
            isRedirected = false;
            isPaused = false;
            testInProcess = false;
            isLastTest = false;
            started = false;
            return this;
        }

        function addUnit(testName, args){
            return addIteration.call(this, 'unit', testName, args);
        }

        function addStep(stepName, args){
            return addIteration.call(this, 'step', stepName, args);
        }

        function addIteration(type, name, args){
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
            testInProcess = true;
            var testNum = !started ? 0 : ($.fn.uat.storage.call(this, 'get', 'testNum') || 0);
            if (testNum >= tests.length) {
                return resultation.call(this);
            }
            if (!started) {
                tests = $.fn.uat.json.call(this, 'load');
                $.each(tests, function(k, v){
                    tests[k].passed = 0;
                    tests[k].date = null;
                    tests[k].result = null;
                });
            }
            var test = tests[testNum];
            if (test.page !== tempLocation || !started || isRedirected) {
                if (!started) {
                    prepareConsole();
                }
                if (isRedirected) {
                    isRedirected = false;
                }
                $.fn.uat.log.call(this, 'page', '--- page', '<a href="' + test.page + '" target="_blank" style="color:#fff;">' + test.page + '</a>' + (redirectionLabel !== null ? ' [' + redirectionLabel + ']' : ''));
                $('[data-current_page]').attr('href', test.page).text(test.page);
                tempLocation = test.page;
            }
            if (!started) {
                started = new Date();
            }
            test.date = new Date();

            if (test.name === 'redirectTo') {
                $('#source_site_iframe').css('filter', 'blur(5px)');
                $('#iframe_loader').css('display', 'flex');
            }

            // send test to remote page
            $('#source_site_iframe').get(0).contentWindow.postMessage(JSON.stringify({command: 'runTest', test: test}), lastTestPage !== null ? lastTestPage : test.page);
        }

        function runTest(test){
            var testResult = $.fn.uat[test.type].call(this, test.name, test.args);
            if (test.type === 'unit' && lastFoundObj !== false) {
                // do not reset lastFoundObj every time
                // do it manually through test.resetObj
                // lastFoundObj = false;
            }
            return testResult;
        }

        prepareConsole = function(force){
            force = typeof force !== 'boolean' ? false : force;
            var resultBlockId = $.fn.uat.view.call(this, 'getSelector', ['result']);
            $(resultBlockId).find('[data-service]').remove();
            if ($('[data-settings_items="whether_clean_console"]').prop('checked') === false || force === true) {
                $(resultBlockId).find('[id^="uat_result_item_"]').remove();
            }
        }

        function receiveTestResult(test, result){
            $.fn.uat.log.call(this, result.type, test.name + ' test: ' + $.fn.uat.args.call(this, test.args), result.result, {'class': 'test-result-' + result.type});
            return testFinished.call(this, test.type, result);
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
        this.hasCookie = function(cookieName, expected){
            return addUnit.call(this, 'hasCookie', [cookieName, expected]);
        }

        // public test
        this.isObjVisible = function(selector, expected){
            return addUnit.call(this, 'isObjVisible', [selector, expected]);
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
        this.resetObj = function(){
            return addStep.call(this, 'resetObj', []);
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
        this.redirectTo = function(url, label){
            url = $.trim(url);
            var result = addStep.call(this, 'redirectTo', [url, typeof label === 'undefined' ? null : label]);
            tempLocation = url;
            return result;
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
            return addStep.call(this, 'fillIn', [selector, value]);
        }

        // public step
        this.scrollToObj = function(selector, extra){
            return addStep.call(this, 'scrollToObj', [selector, extra]);
        }

        // run all steps
        this.finish = function(){
            $.fn.uat.storage.call(this, 'set', 'tests', tests);
            $.fn.uat.log.call(this, null, '--- detect tests...', '', {'data-service': 1});
            if (tests.length) {
                $.fn.uat.log.call(this, null, '--- tests found', tests.length, {'data-service': 1});
                $.fn.uat.log.call(this, null, '--- generating JSON object...', '', {'data-service': 1});
                $.fn.uat.json.call(this, 'prepare');
                $.fn.uat.log.call(this, null, '--- JSON object is ready', '', {'data-service': 1});
            } else {
                $.fn.uat.log.call(this, null, '--- no tests found', '', {'data-service': 1});
            }
        }

        run = function(){
            if (isPaused) {
                return;
            }
            if (!started) {
                setCounter('success', 0);
                setCounter('error', 0);
                addCounter('iterations', 1);
            }
            setTimeout(function(){
                $('body').trigger('uatqueue');
            }, started ? options.timeout * 1000 : 50);
        }

        listeners();

        // run only in TOP level, not in frame
        if (!isFrame) {
            init();
        } else {
            parent.postMessage(JSON.stringify({command: 'frameReady'}), location.href);
        }

        return this;
    }

    /**
     * Unit test constructor
     */
    $.fn.uat.unit = function(testName, testArgs){
        return $.fn.uat.unit[testName].apply(this, testArgs);
    }

    /**
     * TEST: contains
     */
    $.fn.uat.unit.contains = function(selector){
        var result = !!(getLastFoundObj() || $(getOptions().obj)).find(selector).length;
        return {type: result ? 'success' : 'error', result: result};
    }

    /**
     * TEST: notContains
     */
    $.fn.uat.unit.notContains = function(selector){
        var result = !(getLastFoundObj() || $(getOptions().obj)).find(selector).length;
        return {type: result ? 'success' : 'error', result: result};
    }

    /**
     * TEST: hasCookie
     */
    $.fn.uat.unit.hasCookie = function(cookieName, expected){
        expected = typeof expected === 'undefined' ? true : expected;
        var result = new RegExp('(^|; )' + cookieName.toString() + '=([^;$]*)', 'gi').exec(document.cookie),
            status = expected === true ? (result !== null) : (result === null);
        return {type: status ? 'success' : 'error', result: result !== null ? (result[2] !== '' ? result[2] : '[EMPTY VALUE]') : false};
    }

    /**
     * TEST: isObjVisible
     * TODO: improve method, if object is inherit into visible, but scrollable object (parent is visible, but child - not)
     */
    $.fn.uat.unit.isObjVisible = function(selector, expected){
        var obj = $(selector);

        if (
            (obj.css('display') !== 'undefined' && obj.css('display') === 'none')
            ||
            (obj.css('visibility') !== 'undefined' && obj.css('visibility') === 'hidden')
        ) {
            var result = expected === false;
            var visibilityPercentage = 0;
        } else {
            var objTop = obj.length ? obj.offset().top : 0,
                objHeight = obj.outerHeight(),
                objTopHeight = objTop + objHeight,
                fullHeight = $(window).outerHeight() + $(window).scrollTop(),
                result = obj.length && objTop < fullHeight,
                visibilityPercentage = result !== expected ? 0 : (objTopHeight <= fullHeight ? 100 : (objHeight - (objTopHeight - fullHeight)) / objHeight * 100);
        }
        return {type: result === expected ? 'success' : 'error', result: (result === expected ? 'true' : 'false') + ' (' + visibilityPercentage + '%)'};
    }

    /**
     * TEST: hasJsVariable
     */
    $.fn.uat.unit.hasJsVariable = function(variableName){
        var result = typeof window[variableName] !== 'undefined';
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
                        if ($.inArray(objType, ['checkbox', 'radio']) !== -1) {
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
            var result = $.inArray(value, values) !== -1;
            return {type: result ? 'success' : 'error', result: result};
        }
        return {type: 'error', result: 'object not found'};
    }

    /**
     * Move testContainer to another step (another object, redirect to page)
     */
    $.fn.uat.step = function(testName, testArgs){
        return $.fn.uat.unit[testName].apply(this, testArgs);
    }

    /**
     * STEP: findObj
     */
    $.fn.uat.unit.findObj = function(selector){
        setLastFoundObj( $(getOptions().obj).find(selector) );
        if (!getLastFoundObj().length) {
            return {type: 'warning', result: false};
        }
        return {type: 'success', result: true};
    }

    /**
     * STEP: resetObj
     */
    $.fn.uat.unit.resetObj = function(){
        setLastFoundObj(false);
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
     * STEP: fillIn
     */
    $.fn.uat.unit.fillIn = function(selector, value){
        $(selector).val(value).trigger('change');
        return {type: 'success', result: true};
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
    $.fn.uat.unit.redirectTo = function(url, label){
        setTimeout(function(){ location.href = url; }, 100);
        return {type: 'success', result: true, action: 'redirect'};
    }

    $.fn.uat.args = function(args){
        var argsList = [];
        $(args).each(function(){
            argsList.push(this.toString());
        });
        return argsList.join(', ');
    }

    $.fn.uat.view = function(method, args){
        var selectors = {
            window: '#uat_window',
            tests: '#uat_block',
            help: '#uat_help',
            create: '#uat_create',
            result: '#uat_result',
            mouseMover: '#uat_mouse_mover',
            mouseResizer: '#uat_mouse_resize',
            jsonArea: '#uat_json_area'
        }
        var defaultOpacity = .3;
        var that = this;
        var initialState = {width: 'calc(100% - 20px)', height: '300px', left: '10px', top: 'auto', bottom: '5px'};

        this.mouseIsDown = false;
        this.mouseObj = null;
        this.mousePosition = {x: 0, y: 0};

        this.getSelector = function(key) {
            return selectors[key];
        }

        var
            unSelectableCSS = {'-moz-user-select': '-moz-none', '-khtml-user-select': 'none', '-webkit-user-select': 'none', '-ms-user-select': 'none', 'user-select': 'none'},
            blockCSS = {border: '1px solid #333', borderRadius: '4px', padding: '10px'},
            flexCSS = {display: 'flex', flexDirection: 'row'},
            flexColumnCSS = {flexDirection: 'column'},
            scrollableCSS = {overflow: 'auto', overflowX: 'inherit'},
            tabCSS = {borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '3px 6px 8px', cursor: 'pointer', position: 'relative', top: '1px', marginTop: 0, borderLeftWidth: 0, fontSize: '11px', lineHeight: '100%', zIndex: 0},
            tabActiveCSS = {borderBottomColor: '#efefef', zIndex: 2, top: 0, marginTop: '-2px', paddingTop: '6px', paddingBottom: '13px'},
            tabFirstCSS = {borderLeftWidth: '1px'},
            buttonCSS = {cursor: 'pointer', background: '#aaa', color: '#fff', fontWeight: 'normal', padding: '2px 5px', borderRadius: '4px'},
            labelCss = {cursor: 'pointer', background: '#eee', color: '#000', borderRadius: '4px', padding: '2px 5px', position: 'relative', top: '-1px', marginLeft: '3px', textDecoration: 'none', outline: 'none'};

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
                        zIndex: '3'
                    }))
                    .css(typeof windowTop === 'undefined' ? 'bottom' : 'top', windowTop || initialState.bottom)
                    .appendTo('body');

                saveWindowState.call(this);

                var moverDiv = $('<div>')
                    .attr({id: selectors.mouseMover.replace('#', ''), title: 'Move UAT window by moving this bar', 'data-obj': 'mover'})
                    .css($.extend({}, blockCSS, {padding: 0, position: 'absolute', left: '2px', top: '2px', width: 'calc(100% - 4px)', height: '0', borderWidth: '3px', background: '#333', cursor: 'move', boxSizing: 'border-box'}))
                    .appendTo(mainDiv);

                var resizerDiv = $('<div>')
                    .attr({id: selectors.mouseResizer.replace('#', ''), title: 'Resize UAT window by moving this corner', 'data-obj': 'resizer'})
                    .css($.extend({}, blockCSS, {padding: 0, position: 'absolute', bottom: '2px', right: '2px', width: '20px', height: '20px', border: '3px solid #333', borderTop: 0, borderLeft: 0, cursor: 'se-resize'}))
                    .appendTo(mainDiv);

                var testDiv = $('<div>')
                    .attr({id: selectors.tests.replace('#', '')})
                    .css($.extend({}, flexCSS, flexColumnCSS, {width: '100%', marginRight: '10px', zIndex: 1}))
                    .appendTo(mainDiv);

                var rowDiv = $('<div>')
                    .css($.extend({}, flexCSS, {justifyContent: 'space-between'}))
                    .appendTo(testDiv);

                var tabsDiv = $('<div>')
                    .css($.extend({}, flexCSS, {minHeight: '18px', height: '18px'}))
                    .appendTo(rowDiv);

                var tabConsoleDiv = $('<div>')
                    .attr('data-tab', selectors.result)
                    .css($.extend({}, blockCSS, tabCSS, tabActiveCSS, tabFirstCSS))
                    .text('Console')
                    .appendTo(tabsDiv);

                var tabCreateDiv = $('<div>')
                    .attr('data-tab', selectors.create)
                    .css($.extend({}, blockCSS, tabCSS))
                    .text('Setup')
                    .appendTo(tabsDiv);

                var statsDiv = $('<div>')
                    .css($.extend({}, flexCSS))
                    .appendTo(rowDiv);

                var currentPageDiv = $('<a data-current_page>')
                    .css($.extend({}, labelCss, {textDecoration: 'underline'}))
                    .attr({href: '#', target: '_blank', title: 'Current page, where tests are run'})
                    .text('')
                    .appendTo(statsDiv);

                var statsSuccessDiv = $('<a data-tests="success">')
                    .css($.extend({}, labelCss, {background: 'green', color: '#fff'}))
                    .html('<span>Passed:</span> <b>0</b>')
                    .attr('title', 'Click to see only passed tests')
                    .appendTo(statsDiv);

                var statsFailedDiv = $('<a data-tests="error">')
                    .css($.extend({}, labelCss, {background: 'pink', color: '#cc0000'}))
                    .html('<span>Failed:</span> <b>0</b>')
                    .attr('title', 'Click to see only failed tests')
                    .appendTo(statsDiv);

                var statsIterationsDiv = $('<div data-tests="iterations">')
                    .css($.extend({}, labelCss, {background: '#aaa', color: '#000'}))
                    .html('<span>/</span> <b>0</b>')
                    .attr('title', 'Count of tests cycles')
                    .appendTo(statsDiv);

                var testConsoleDiv = $('<div>')
                    .attr({id: selectors.result.replace('#', ''), 'data-tab-content': ''})
                    .css($.extend({}, blockCSS, {height: '100%', borderTopLeftRadius: 0}, scrollableCSS))
                    .appendTo(testDiv);

                var testCreateDiv = $('<div>')
                    .attr({id: selectors.create.replace('#', ''), 'data-tab-content': ''})
                    .css($.extend({}, blockCSS, {height: '100%', borderTopLeftRadius: 0}, scrollableCSS))
                    .hide()
                    .appendTo(testDiv);

                var jsonTextArea = $('<textarea>')
                    .attr({id: selectors.jsonArea.replace('#', ''), readonly: true})
                    .css($.extend({}, blockCSS, {background: '#fff', height: '80px', minHeight: '60px', width: '100%', maxWidth: '100%', minWidth: '100%', outline: 'none', padding: 0, margin: 0, fontSize: '11px', lineHeight: '100%'}))
                    .appendTo(testCreateDiv);

                var settingsArea = $('<div>')
                    .css({marginTop: '10px', borderTop: '1px solid #000', paddingTop: '10px'})
                    .appendTo(testCreateDiv);

                var whetherCleanConsoleBetweenIterations = $('<label>')
                    .html('<input type="checkbox" data-settings_items="whether_clean_console" style="vertical-align:middle;" /> Do not clean console before new iteration of tests')
                    .appendTo(settingsArea);

                var helpDiv = $('<div>')
                    .attr({id: selectors.help.replace('#', '')})
                    .css($.extend({}, blockCSS, {width: '100%', maxWidth: '300px'}, scrollableCSS))
                    .append('<div style="margin-bottom:10px;"><div style="float:right;"><b data-uat_keycode="U">Ctrl + Alt + U</b></div><div>Show / hide UAT window</div><div style="font-size:11px;margin-top:4px;">If init option <i>output</i> equals to <i>window</i>, it will be showen automatically.<div></div>')
                    .append('<div style="margin-bottom:10px;"><div style="float:right;"><b data-uat_keycode="R">Ctrl + Alt + R</b></div><div>Restore UAT window to initial state</div><div style="font-size:11px;margin-top:4px;">Full width, sticked to bottom of the window</div></div>')
                    .append('<div style="margin-bottom:10px;"><div style="float:right;"><b data-uat_keycode="G">Ctrl + Alt + G</b></div><div>Start tests</div></div>')
                    .append('<div style="margin-bottom:10px;"><div style="float:right;"><b data-uat_keycode="P">Ctrl + Alt + P</b></div><div>Pause / resume tests</div></div>')
                    .append('<div style="margin-bottom:10px;"><div style="float:right;"><b data-uat_keycode="S">Ctrl + Alt + S</b></div><div>Stop tests</div></div>')
                    .append('<div style="margin-bottom:10px;"><div style="float:right;"><b data-uat_keycode="C">Ctrl + Alt + C</b></div><div>Clean console</div></div>')
                    .appendTo(mainDiv);

                helpDiv.find('b').css(buttonCSS);

                this.showResults('window');
            }
        }

        this.CtrlAltU = function(e){
            e.preventDefault();
            draw.call(that);
        }

        this.CtrlAltR = function(e){
            e.preventDefault();
            restate.call(that);
        }

        this.CtrlAltS = function(e){
            e.preventDefault();
            if (getIsPaused()) {
                resultation();
            } else if (isStarted()) {
                finishAfterCurrent();
            }
        }

        this.CtrlAltG = function(e){
            e.preventDefault();
            if (getIsPaused()) {
                $.fn.uat.log.call(this, null, 'Tests are on the PAUSE. Use CTRL + ALT + P to resume the queue.');
                return;
            }
            run();
        }

        this.CtrlAltP = function(e){
            e.preventDefault();
            if (!isStarted()) {
                return;
            }
            togglePause();
            if (!getIsPaused() && !getTestInProcess()) {
                run();
            }
        }

        this.CtrlAltC = function(e){
            e.preventDefault();
            prepareConsole(true);
        }

        function keyboardListener(){
            $('body')
                .on('mouseover touchstart', selectors.window, function(){ $(this).css('opacity', 1); })
                .on('mouseout touchend', selectors.window, function(){ $(this).css('opacity', defaultOpacity); })
                .on('mousedown touchstart', selectors.mouseMover + ',' + selectors.mouseResizer, function(e){
                    that.mouseIsDown = true;
                    that.mouseObj = $(this);
                    that.mousePosition.x = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
                    that.mousePosition.y = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
                    $(this).data('border', $(this).css('border-color'));
                    $(this).css('border-color', 'red');
                })
                .on('click', '[data-tab]', function(e){
                    e.preventDefault();
                    $(this).siblings('[data-tab]').css($.extend({}, blockCSS, tabCSS));
                    $(this).css($.extend({}, blockCSS, tabCSS, tabActiveCSS));
                    $(this).parent().find('[data-tab]').eq(0).css(tabFirstCSS);
                    var block = $('[data-tab-content]' + $(this).data('tab'));
                    block.show().siblings('[data-tab-content]').hide();
                })
                .on('click', selectors.jsonArea, function(){
                    var area = $(this).get(0);
                    area.focus();
                    area.select();
                })
                .on('click', '[data-uat_keycode]', function(e){
                    var functionName = 'CtrlAlt' + $(this).data('uat_keycode');
                    that[functionName](e);
                    //var functionTemp = new Function(functionName);
                    //functionTemp(e);
                    //$.fn.uat.view.call(that, functionName, e);
                })
                .on('click', '[data-tests]', function(e){
                    e.preventDefault();
                    $('#test_result_selection').remove();
                    if ($(this).hasClass('clicked')) {
                        $(this).removeClass('clicked').siblings('[data-tests]').css('opacity', '1');
                    } else {
                        $('body').append('<style id="test_result_selection">[class^="test-result-"]{display:none;}.test-result-'+$(this).data('tests')+'{display:block;}</style>');
                        $(this).addClass('clicked').css('opacity', '1').siblings('[data-tests]').removeClass('clicked').css('opacity', '.5');
                    }
                });

            $(window)
                .on('keydown', function(e){
                    if (!(e.ctrlKey && e.altKey)) {
                        return;
                    }

                    switch (e.keyCode) {
                        case 85:        // U
                            this.CtrlAltU(e);
                            break;
                        case 82:        // R
                            this.CtrlAltR(e);
                            break;
                        case 83:        // S    // stop
                            this.CtrlAltS(e);
                            break;
                        case 71:        // G    // start (go)
                            this.CtrlAltG(e);
                            break;
                        case 80:        // P    // pause
                            this.CtrlAltP(e);
                            break;
                        case 67:        // C    // clean console
                            this.CtrlAltC(e);
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
                        var x = e.type === 'mousemove' ? e.clientX : e.changedTouches[0].clientX,
                            y = e.type === 'mousemove' ? e.clientY : e.changedTouches[0].clientY,
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

        this.addLine = function(key, value, style, attrs){
            var id = 'uat_result_item_' + Math.random() * 100000;
            var resultBlock = $(selectors.result);
            attrs = typeof attrs !== 'object' ? {} : attrs;
            $('<div>')
                .attr($.extend({}, {style: style, id: id}, attrs))
                .html(key + ($.trim(value.toString()) !== '' ? ': ' + value : ''))
                .appendTo(resultBlock);
            resultBlock.animate({scrollTop: resultBlock.prop("scrollHeight")}, 0);
        }

        this.init = function(){
            if (getOptions().output === 'window') {
                draw.call(this);
            }
            keyboardListener();
        }

        return this[method || 'init'].apply(this, args || []);
    }

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

        if (typeof arguments !== 'undefined' && arguments.length) {
            return this[arguments[0]].apply(this, Array.from(arguments).slice(1));
        }
    }

    $.fn.uat.log = function(type, key, value, attrs){
        var color = 'black',
            background = 'transparent';

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
            case 'page':
                color = 'white';
                background = 'black';
                break;
        }

        function write(key, value, color, attrs){
            addLogScope([key, value, color, attrs]);
            show.call(this, key, value, color, attrs, getOptions().output);
        }

        function show(key, value, color, attrs, output){
            var style = 'color:' + color + ';background:' + background;
            value = typeof value === 'undefined' ? '' : value;

            if (output === 'console') {
                console.log('%c' + key, style, value);
            } else {
                $.fn.uat.view.call(this, 'addLine', [key, value, style, attrs]);
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
                write.call(
                    this,
                    (typeof type !== 'undefined' && type != null ? '[' + (new Date().toLocaleString()) + '] [' + type.toUpperCase() + '] ' : '') + key,
                    value,
                    color,
                    attrs
                );
        }
    }

    $.fn.uat.json = function(method){
        function prepare() {
            var tests = $.fn.uat.storage.call(this, 'get', 'tests');
            var block = $.fn.uat.view.call(this, 'getSelector', ['jsonArea']);
            $.each(tests, function(k, v){
                delete tests[k]['passed'];
                delete tests[k]['date'];
                delete tests[k]['result'];
            });
            $(block).text(JSON.stringify(tests));
        }

        function load() {
            var block = $.fn.uat.view.call(this, 'getSelector', ['jsonArea']);
            var tests = JSON.parse($(block).val());
            $.fn.uat.storage.call(this, 'set', 'tests', tests);
            return tests;
        }

        var methods = {prepare: prepare, load: load};
        return methods[method].call(this);
    }
}(jQuery));
