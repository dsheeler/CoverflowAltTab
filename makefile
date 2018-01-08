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

USERNAME := $(shell whoami)
NORMAL_PATH := .local/share/gnome-shell/extensions/
SUPER_PATH := /usr/share/gnome-shell/extensions/
SRC_DIR := CoverflowAltTab@dmo60.de
LOCALE_DIR=${SRC_DIR}/locale

SCHEMA_DIR=${SRC_DIR}/schemas
SCHEMA_FILE=org.gnome.shell.extensions.coverflowalttab.gschema.xml

all: translations schema install

translations: ${LOCALES_FILE}
	msgfmt "${LOCALE_DIR}/cs/LC_MESSAGES/coverflow.po" -o "${LOCALE_DIR}/cs/LC_MESSAGES/coverflow.mo"
	msgfmt "${LOCALE_DIR}/de/LC_MESSAGES/coverflow.po" -o "${LOCALE_DIR}/de/LC_MESSAGES/coverflow.mo"
	msgfmt "${LOCALE_DIR}/fr/LC_MESSAGES/coverflow.po" -o "${LOCALE_DIR}/fr/LC_MESSAGES/coverflow.mo"
	msgfmt "${LOCALE_DIR}/it/LC_MESSAGES/coverflow.po" -o "${LOCALE_DIR}/it/LC_MESSAGES/coverflow.mo"
	msgfmt "${LOCALE_DIR}/pt_BR/LC_MESSAGES/coverflow.po" -o "${LOCALE_DIR}/pt_BR/LC_MESSAGES/coverflow.mo"
	msgfmt "${LOCALE_DIR}/zh_CN/LC_MESSAGES/coverflow.po" -o "${LOCALE_DIR}/zh_CN/LC_MESSAGES/coverflow.mo"

ifneq ($(LOCALINSTALL),)
install:
	cp -r "${SRC_DIR}" $(SUPER_PATH)
else
install:
	cp -r "${SRC_DIR}" /home/$(USERNAME)/$(NORMAL_PATH)
endif

schema: ${SCHEMA_DIR}/${SCHEMA_FILE}
	glib-compile-schemas "${SCHEMA_DIR}"
