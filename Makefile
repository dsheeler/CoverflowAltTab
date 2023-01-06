# Copyright (c) 2017, gesangtome <gesangtome@foxmail.com>. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#     * Redistributions of source code must retain the above copyright
#       notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
#       copyright notice, this list of conditions and the following
#       disclaimer in the documentation and/or other materials provided
#       with the distribution.
#     * Neither the name of The Linux Foundation nor the names of its
#       contributors may be used to endorse or promote products derived
#       from this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED "AS IS" AND ANY EXPRESS OR IMPLIED
# WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT
# ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS
# BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
# BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
# WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
# OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN
# IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

NORMAL_PATH := ${HOME}/.local/share/gnome-shell/extensions
SUPER_PATH := /usr/share/gnome-shell/extensions
SYSTEMWIDE_SCHEMA_PATH := /usr/share/glib-2.0/schemas
SRC_DIR := CoverflowAltTab@dmo60.de
LOCALE_DIR=${SRC_DIR}/locale
PROJECT_NAME := coverflow
POT_FILE := ${SRC_DIR}/${PROJECT_NAME}.pot
PO_FILES := $(wildcard $(LOCALE_DIR)/*/*/*.po)
MO_FILES := $(PO_FILES:.po=.mo)

SCHEMA_DIR=${SRC_DIR}/schemas
SCHEMA_FILE=org.gnome.shell.extensions.coverflowalttab.gschema.xml

all: translations schema install

build:
	mkdir build
	cd src && gnome-extensions pack -f \
		--extra-source ./coverflowSwitcher.js \
		--extra-source ./keybinder.js \
		--extra-source ./lib.js \
		--extra-source ./manager.js \
		--extra-source ./platform.js \
		--extra-source ./preview.js \
		--extra-source ./switcher.js \
		--extra-source ./timelineSwitcher.js \
		--extra-source ../metadata.json \
		--extra-source ../ui \
		--schema ../schemas/org.gnome.shell.extensions.coverflowalttab.gschema.xml \
		--podir ../locale/ \
		-o ../build/

${SRC_DIR}/${PROJECT_NAME}.pot: ${SRC_DIR}/*.js
	xgettext ${SRC_DIR}/*.js -L JavaScript -o $@ --package-name=${PROJECT_NAME}

translations: $(MO_FILES)

%.mo: %.po
	msgfmt --check --output-file=$@ $<

mergepo: $(POT_FILE)
	@for po in $(PO_FILES); \
	do \
		msgmerge --add-location --backup=none --update $${po} $(POT_FILE); \
	done;

ifneq ($(LOCALINSTALL),)
INSTALL_PATH = $(SUPER_PATH)
else
INSTALL_PATH = $(NORMAL_PATH)
endif

install:
	cp -r "$(SRC_DIR)" $(INSTALL_PATH)

uninstall:
	rm -rf $(INSTALL_PATH)/$(SRC_DIR)
	rm ${SCHEMA_DIR}/gschemas.compiled

schema: ${SCHEMA_DIR}/${SCHEMA_FILE}
	glib-compile-schemas "${SCHEMA_DIR}"

install_schema_systemwide:
	cp ${SCHEMA_DIR}/${SCHEMA_FILE} ${SYSTEMWIDE_SCHEMA_PATH}
	glib-compile-schemas ${SYSTEMWIDE_SCHEMA_PATH}

uninstall_schema_systemwide:
	rm ${SYSTEMWIDE_SCHEMA_PATH}/${SCHEMA_FILE}
	glib-compile-schemas ${SYSTEMWIDE_SCHEMA_PATH}
