# jQuery User Acceptance Tests plugin

Check you webpages through webbrowser. It's something similar to Selenium or CodeException.

[![GitHub license](https://img.shields.io/github/license/thewind1984/jquery-uat.svg)](https://github.com/thewind1984/jquery-uat/blob/master/LICENSE)

[![GitHub forks](https://img.shields.io/github/forks/thewind1984/jquery-uat.svg)](https://github.com/thewind1984/jquery-uat/network)
[![GitHub stars](https://img.shields.io/github/stars/thewind1984/jquery-uat.svg)](https://github.com/thewind1984/jquery-uat/stargazers)

### Purposes of the plugin

You can implement this simple and lightweight jquery plugin into your pages and run automatic tests of UI.  
Tests results could be shown either in browser's console or in HTML DOM's layer.

### Options

* `timeout` *default = `0`*  
number of milliseconds (!) for timeout between tests / steps
* `output` ['console', 'window'] *default = `console`*  
where to output results of the tests

### Possible tests

* `.contains (string: selector)`  
page contains element
* `.notContains (string: selector)`  
page does not contains element
* `.hasCookie (string: cookieName)`  
page has cookie
* `.hasJsVariable (string variableName)`  
page has JS variable
* `.isObjVisible (string: selector)`  
is object visible on the current window area
* `.valueEqualsTo (string: selector, string: value)`  
is value of object equaled to...  
This test can be applied to any field (`select`, `input`, `button`, `textarea`). In case of multiple select or checkbox / radio input, test will check every selected / checked object. So, it's universal.

### Possible steps between tests

* `.findObj (string: selector)`  
moves current caret to the object by selector id  
**NOTE:** *when you run any test after `.findObj`, caret will be returned to the root object (with which plugin was initialized) after test is done*
* `.setCookie (string: cookieName, mixed: cookieValue)`  
sets new cookie (or updates existing) with the passed value
* `.removeCookie (string: cookieName)`  
removes cookie by its name
* `.clickBy (string: selector)`  
clicks by any object (calls trigger)
* `.scrollToObj (string: selector, number: extra)`  
scrolls the page to the position equaled to the `.offset().top` coordinate of the object, found by selector.  
**NOTE:** *You can add some pixels by passing `extra` argument, which is integer by default.*
* `.wait (number: ms)`  
waits for passed milliseconds before the next test / step. It could be helpful, if you called `.clickBy` method, which uses some animation, and then you would like to check for instance, `.isObjVisible`
* `.redirectTo (string: url)`  
redirects current page to another URL in order to proceed with tests  
**NOTE 1:** *each page should include .js file of plugin in order to be initialized after DOM is loaded*  
**NOTE 2:** *redirection to the initial page, from where tests are started, could bring unexpected results (ONLY FOR v1.*)*

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

## Roadmap

* Using tests through website (with redirections)
* Implementing of methods `.fillIn` (for populating of any input fields) and `.waitFor` for waiting for appearing of some objects
* Saving and restoring tests' configurations with JSON format
* Adding initialization options, like `step_by_step`, `break_on_error` 

## Demo

* [1st simple demo with `.contains` and `.notContains` methods, output to **window**](https://thewind1984.github.io/jquery-uat/demo/01_simple.html)
* [2nd simple demo with `.contains` and `.notContains` methods, output to **console**](https://thewind1984.github.io/jquery-uat/demo/02_simple.html)
* [3rd complex demo with different methods and redirections](https://thewind1984.github.io/jquery-uat/demo/03_simple.html)

## Versions

* **2.0.0**  
Release date: *3th August, 2018*
* **1.0.1**  
Release date: *3th July, 2018*
* **1.0**  
Release date: *30th June, 2018*
* **RC1.0**  
Release date: *25th June, 2018*
