.PHONY: help check ios sim release screenshots

.DEFAULT_GOAL := help

# App Store region the build targets: us (Canada/US, default) or cn. Info.plist AppStoreRegion.
STORE ?= us
export STORE

help:
	@echo "make ios            Release build onto the connected iPhone"
	@echo "make sim            Release build onto a simulator (only when asked)"
	@echo "  STORE=cn on ios/sim/release builds for the China App Store (default us: Canada/US)"
	@echo "make check          typecheck, lint, tests"
	@echo "make release        check, then archive + upload to App Store Connect"
	@echo "make release BUILD=202610021830   same, with the build number pinned"
	@echo "make screenshots SHOTS=<dir>      resize to the App Store slots"

check:
	npm run typecheck
	npm run lint
	npm test

ios:
	scripts/install-ios-device.sh

sim:
	scripts/install-ios-sim.sh

# Needs ios/Local.xcconfig (Team ID) and the app record in App Store Connect.
release: check
	@git diff --quiet HEAD -- || echo "warning: uncommitted changes are going into this build"
	scripts/release-ios.sh $(BUILD)

screenshots:
	scripts/store-screenshots.sh $(SHOTS)
