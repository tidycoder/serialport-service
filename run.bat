@echo off
if "%1" == "h" goto begin 
mshta vbscript:createobject("wscript.shell").run("%~nx0 h",0)(window.close)&&exit 
:begin 
::下面是你自己的代码。
start /b node.exe index.js 1>>output.log 2>>&1
