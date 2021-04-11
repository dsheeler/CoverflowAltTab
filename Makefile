INSTALL_PATH = ~/.local/share/gnome-shell/extensions
INSTALL_NAME = CoverflowAltTab@dmo60.de

install: build
	rm -rf $(INSTALL_PATH)/$(INSTALL_NAME)
	mkdir -p $(INSTALL_PATH)/$(INSTALL_NAME)
	cp -r _build/* $(INSTALL_PATH)/$(INSTALL_NAME)
	rm -rf _build
	echo Installed in $(INSTALL_PATH)/$(INSTALL_NAME)

build: compile-schema
	rm -rf _build
	mkdir _build
	cp -r CoverflowAltTab@dmo60.de/* _build
	echo Build was successfull

compile-schema: ./CoverflowAltTab@dmo60.de/schemas/org.gnome.shell.extensions.coverflowalttab.gschema.xml
	glib-compile-schemas CoverflowAltTab@dmo60.de/schemas

clean:
	rm -rf _build
