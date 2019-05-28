# jQuery User Acceptance Tests plugin

Check you webpages through webbrowser. It's something similar to Selenium or CodeException.

[![GitHub license](https://img.shields.io/github/license/thewind1984/jquery-uat.svg)](https://github.com/thewind1984/jquery-uat/blob/master/LICENSE)

[![GitHub forks](https://img.shields.io/github/forks/thewind1984/jquery-uat.svg)](https://github.com/thewind1984/jquery-uat/network)
[![GitHub stars](https://img.shields.io/github/stars/thewind1984/jquery-uat.svg)](https://github.com/thewind1984/jquery-uat/stargazers)

### Purposes of the plugin

You can implement this simple and lightweight jquery plugin into your pages and run automatic tests of UI.  
Tests results could be shown either in browser's console or in HTML DOM's layer.

### Options

* `timeout` **float** *default = `0`*  
number of milliseconds (!) for timeout between tests / steps
* `output` **string** ['console', 'window'] *default = `console`*  
where to output results of the tests
* `child` **boolean** *default = `false`*  
if page, where the script is involved, is supposed to be tested, `child` option should be set to `true` to avoid initialization of the script, when page is loaded normally in browser.

#### How to setup plugin

1. *Main page*
```javascript
var uatObj;
$(document).ready(function(){
    uatObj = $(document).uat({
        output: 'window'
    });
});
```
2. *Children pages*
```javascript
$(document).ready(function(){
    $(document).uat({
        child: true
    });
});
```

### Possible tests

* `.contains (string: selector, boolean expected)`  
whether document contains element selected by `selector` or not
* `.sourceContains (string selector, string content, boolean expected)`  
whether element selected by `selector` contains `content` or not
* `.sourceEqualsTo (string selector, string content, boolean expected)`  
whether element selected by `selector` has exactly the same HTML content as `content` or not
* `.hasCookie (string: cookieName, boolean: expected)`  
whether document has cookie with `cookieName` or not
* `.cookieValue (string cookieName, string cookieValue, boolean expected)`
whether cookie with `cookieName` exists and its value equals to `cookieValue` or not
* `.isObjVisible (string: selector, boolean: expected)`  
whether object selected by `selector` is visible on the current window area or not
* `.hasJsVariable (string variableName, boolean expected)`  
whether document has JS variable with `variableName` or not
* `.valueEqualsTo (string: selector, string: value)`  
whether value of object selected by `selector` equaled to `value`  

These tests can be applied to any field (`select`, `input`, `button`, `textarea`).  
In case of multiple select or checkbox / radio input, test will check every selected / checked object.  

### Possible steps between tests

* `.findObj (string: selector)`  
moves current caret to the object by selector id  
**NOTE:** *when you run any test after `.findObj`, caret will be returned to the root object (with which plugin was initialized) after test is done*
* `.resetObj ()`  
resets the object, previously found in `.findObj` method
* `.setCookie (string: cookieName, mixed: cookieValue)`  
sets new cookie (or updates existing) with the passed value
* `.removeCookie (string: cookieName)`  
removes cookie by its name
* `.scrollToObj (string: selector, number: extra)`  
scrolls the page to the position equaled to the `.offset().top` coordinate of the object, found by selector.  
**NOTE:** *You can add some pixels by passing `extra` argument, which is integer by default.*
* `.appendTo (string selector, string|object content)`  
appends any html or jquery object to the parent, found by `selector`
* `.fillIn (string: selector, mixed: value)`  
Fills any object by selector with specified value
* `.clickBy (string: selector)`  
clicks by any object (calls trigger)
* `.wait (number: ms)`  
waits for passed milliseconds before the next test / step. It could be helpful, if you called `.clickBy` method, which uses some animation, and then you would like to check for instance, `.isObjVisible`
* `.redirectTo (string: url)`  
redirects current page to another URL in order to proceed with tests  
**NOTE:** *each page should include .js file of plugin in order to be initialized after DOM is loaded*  
* `.formSubmit (string selector)`  
submits the form by given selector

### Tests sets

You can combine tests, save them to `testSet` and run repeatably with variable parameters.

* `.beginTestSet (string testName)`  
will start new testSet with specified `testName` recording  
**NOTE:** *if testSet with specified name is already exist, then method will do nothing. Does not matter, was specified testSet commited or not.*
* `.commitTestSet`  
will commit (finish) testSet with specified `testName`, if it exists (started and not commited yet)
* `.involveTestSet (string testName, object overwrittenParams)`  
will repeat commited testSet with opportunity to overwrite some parameters for some tests.  
See example below.

#### How to create test set

1. *Simple testSet*  
```javascript
uatObj
    .removeCookie('my_cookie')                                      // remove cookie just to test to be passed
    .beginTestSet('usual')                                          // start record new testSet
        .contains('.my-class')
        .hasCookie('my_cookie', false)
    .commitTestSet()                                                // save testSet
    .redirectTo('http://my.anotherdomain.com/anypage.html')         // goto another page
    .involveTestSet('usual')                                       // this will run 2 tests actually (contains and hasCookie)
    .finish();
```
2. *TestSet with overwritten parameters*
```javascript
uatObj
    .beginTestSet('usual')
        .contains('.my-class')
        .hasCookie('my_cookie', false, 'check_my_cookie')          // label check_my_cookie was added for this test
    .commitTestSet()
    .redirectTo('http://my.anotherdomain.com/anypage.html')
        .setCookie('my_cookie', 'anyvalueforcookie')
    .involveTestSet('usual', {
        'check_my_cookie': ['my_cookie', true]                      // since we set cookie after redirection, it will be existed (expected param should be true, otherwise test will fail)
    })
    .cookieValue('my_cookie', 'anyvalueforcookie')                  // just to check, that cookie has proper value
    .finish();
``` 

### Hotkeys

* `CTRL + ALT + U`  
toggle (show / hide) output layer in the browser's window
* `CTRL + ALT + R`  
reset UAT window position / dimensions to default
* `CTRL + ALT + S`  
stop tests, which are already run
* `CTRL + ALT + G`  
run tests from the start (`goto`)
* `CTRL + ALT + P`  
pause / resume tests
* `CTRL + ALT + C`  
clean console

## Roadmap

* Implementing `.waitFor` method for waiting for appearing of some objects
* Restoring tests' configurations with JSON format
* Adding initialization options, like `step_by_step`, `break_on_error` 
* Manage inline options on-the-fly inside UAT window

## Demo

* [1st simple demo with `.contains` and `.notContains` methods, output to **window**](https://thewind1984.github.io/jquery-uat/demo/01_simple.html)
* [2nd simple demo with `.contains` and `.notContains` methods, output to **console**](https://thewind1984.github.io/jquery-uat/demo/02_simple.html)
* [3rd complex demo with different methods and redirections](https://thewind1984.github.io/jquery-uat/demo/03_simple.html)

## Versions

* **2.1.0**  
Unreleased yet
* **2.0.0**  
Release date: *3th August, 2018*
* **1.0.1**  
Release date: *3th July, 2018*
* **1.0**  
Release date: *30th June, 2018*
* **RC1.0**  
Release date: *25th June, 2018*
