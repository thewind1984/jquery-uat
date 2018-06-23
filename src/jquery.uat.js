/**
 * @name jQuery.UAT
 * @summary Plugin for UAT (User Acceptance Testing) of pages
 * @author thewind <thewind05@gmail.com>
 * @version 1.0
 * @pubdate: 2018-06-19
 *
 * @todo
 * - date format (d.m.Y H:i:s:ms)
 *
 * - implement methods:
 * ++ setCookie (add prefix for name and remove cookie after finishing tests; also remove all cookies with prefix at the start of script)
 * ++ removeCookie
 * -- redirectTo(pageURL: string)
 * ++ scrollToObj(selector: string)
 * ++ clickBy(selector: string)
 * ++ wait(milliSeconds: number)
 * -- waitFor(testName: string, selector: string, maxTimeout: number)
 * -- fillIn(selector: string, value: string|array)
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
        var testNum = 0;
        var storageTestKey = 'uat_tests';
        var lastFoundObj = false;
        var currentLocation = location.href;
        var started = false;
        var bodyMarginBottom = parseFloat($('body').css('margin-bottom'));
        
        // private
        function init(){
            console.clear();                // clear console
            initStorage.call(this);         // prepare storage data
            $.fn.uat.view.call(this);       // prepare output
            listeners.call(this);           // setup event listeners
            return this;
        }

        function listeners(){
            var that = this;
            $(settings.obj).on('uatqueue', function(e){
                runQueue.call(that);
            });
        }
        
        function initStorage(){
            var storedTests = localStorage.getItem('uat_tests');
            if (typeof storedTests != 'undefined' && storedTests != null) {
                storedTests = JSON.parse(storedTests);
                console.log('storedTests', storedTests);
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
            tests[testNum].result = resultData;
            if (settings.timeout) {
                $.fn.uat.log.call(this, null, '--- timeout', settings.timeout + 'sec');
                sleep(settings.timeout * 1000)
            }
            return this;
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
                args: args,
                passed: 0,
                date: null,
                result: null,
                page: currentLocation,
            });
            return this;
        }

        function runQueue(){
            if (testNum >= tests.length) {
                return resultation.call(this);
            }
            if (!started) {
                $.fn.uat.log.call(this, null, '--- page', currentLocation);
                started = new Date();
            }
            var test = tests[testNum];
            test.date = new Date();
            test.passed = 1;
            $.fn.uat[test.type].call(this, test.name, test.args);
            testNum++;
            this.finish();
        }
        
        // public test
        this.contains = function(selector){
            return addUnit.call(this, 'contains', [selector]);
            //return $.fn.uat.unit.call(this, 'contains', [selector]);
        }
        
        // public test
        this.notContains = function(selector){
            return addUnit.call(this, 'notContains', [selector]);
            //return $.fn.uat.unit.call(this, 'notContains', [selector]);
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
            //return $.fn.uat.step.call(this, 'findObj', [selector]);
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
            setTimeout(function(){
                $(settings.obj).trigger('uatqueue');
            }, started ? settings.timeout * 1000 : 50);
            //$.fn.uat.log.call(this, 'info', 'finished');
        }
        
        return init.call(this);
    }
    
    /**
     * Unit test constructor
     */
    $.fn.uat.unit = function(testName, testArgs){
        var resultData = $.fn.uat.unit[testName].apply(this, testArgs);
        $.fn.uat.log.call(this, resultData.type, testName + ' test: ' + getArgsString(testArgs), resultData.result);
        return testFinished.call(this, 'unit', resultData);
        
        function getArgsString(args){
            var argsList = [];
            $(args).each(function(){
                argsList.push(this.toString());
            });
            return argsList.join(', ');
        }
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
        $.fn.uat.log.call(this, resultData.type, testName + ' test: ' + getArgsString(testArgs), resultData.result);
        return testFinished.call(this, 'step', resultData);
        
        function getArgsString(args){
            var argsList = [];
            $(args).each(function(){
                argsList.push(this.toString());
            });
            return argsList.join(', ');
        }
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
        $('html,body').scrollTop($(selector).offset().top + (extra || 0));
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
        }
        
        function draw(){
            if ($(selectors.window).length) {
                var mainDiv = $(selectors.window);
                mainDiv.toggle();
            } else {
                var
                    blockCSS = {border: '1px solid #333', borderRadius: '4px', padding: '10px'},
                    flexCSS = {display: 'flex', flexDirection: 'row'},
                    flexColumnCSS = {flexDirection: 'column'};

                var mainDiv = $('<div>')
                    .attr({id: selectors.window.replace('#', '')})
                    .css($.extend({}, flexCSS, {
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '300px',
                        background: '#f1f1f1',
                        color: '#000',
                        fontSize: '12px',
                        fontFamily: 'Arial',
                        fontWeight: 'normal',
                        fontStyle: 'normal',
                        padding: '10px',
                        margin: 0,
                        boxSizing: 'border-box',
                        borderTop: '2px solid #bbb',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        justifyContent: 'space-between',
                    }))
                    .appendTo('body');

                var testDiv = $('<div>')
                    .attr({id: selectors.tests.replace('#', '')})
                    .css($.extend({}, flexCSS, flexColumnCSS, {width: '100%', marginRight: '10px'}))
                    .appendTo(mainDiv);

                var testCreateDiv = $('<div>')
                    .attr({id: selectors.create.replace('#', '')})
                    .css($.extend({}, blockCSS, {marginBottom: '10px', height: '200px', maxHeight: '30%'}))
                    .appendTo(testDiv);

                var testResultDiv = $('<div>')
                    .attr({id: selectors.result.replace('#', '')})
                    .css($.extend({}, blockCSS, {height: '100%', overflow: 'auto', overflowX: 'inherit'}))
                    .appendTo(testDiv);

                var helpDiv = $('<div>')
                    .attr({id: selectors.help.replace('#', '')})
                    .css($.extend({}, blockCSS, {width: '100%', maxWidth: '300px'}))
                    .appendTo(mainDiv);
            }
            $('body').css('margin-bottom', getBodyMarginBottom() + (mainDiv.css('display') == 'none' ? 0 : mainDiv.outerHeight()) + 'px');
        }
        
        function keyboardListener(){
            $(window).on('keydown', function(e){
                if (e.ctrlKey && e.altKey && e.keyCode == 85) {
                    draw();
                }
            });
        }

        addLine = function(key, value, style){
            var id = 'uat_result_item_' + Math.random() * 100000;
            var resultBlock = $(selectors.result);
            $('<div>')
                .attr({style: style, id: id})
                .html(key + ': ' + value)
                .appendTo(resultBlock);
            resultBlock.animate({scrollTop: resultBlock.prop("scrollHeight")}, 500);
        }
        
        this.init = function(){
            if (getSettings().output == 'window') {
                draw();
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
            var style = 'color:' + color;
            value = typeof value == 'undefined' ? '' : value;

            if (getSettings().output == 'console') {
                console.log('%c' + key, style, value);
            } else {
                $.fn.uat.view.call(this, 'addLine', [key, value, style]);
            }
        }

        write((typeof type != 'undefined' && type != null ? '[' + (new Date().toLocaleString()) + '] [' + type.toUpperCase() + '] ' : '') + key, value, color);
    }
}(jQuery));
