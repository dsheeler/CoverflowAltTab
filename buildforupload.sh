#!/bin/bash
rm -rf CoverflowAltTab@palatis.blogspot.com.zip
cd CoverflowAltTab@dmo60.de/
zip -r ../CoverflowAltTab@palatis.blogspot.com.zip * -x '*.pot' -x '*.po' -x 'settings-schema.json'
cd ../CoverflowAltTab@palatis.blogspot.com
zip ../CoverflowAltTab@palatis.blogspot.com.zip metadata.json
