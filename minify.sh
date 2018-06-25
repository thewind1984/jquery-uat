# TODO: getting version from README.md file
# echo '--- version detecting starts:'
# echo '--- version detecting dons'
echo '--- minification starts:'
uglifyjs --compress --mangle --comments /^\@/ --output ./dist/jquery.uat-1.0.min.js ./src/jquery.uat.js
echo '--- minification done'
