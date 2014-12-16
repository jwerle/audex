
C8 ?= $(shell which component || echo ./node_modules/.bin/component)
RM ?= $(shell which rm)
NPM ?= $(shell which npm)
TESTS ?= $(wildcard test/*.js)
BUILD ?= build/
SERVE ?= $(shell which serve || echo ./node_modules/.bin/serve)

COMPONENTS ?= components
NODE_MODULES ?= node_modules

all: dependencies build

.PHONY: build
build:
	$(C8) build

deps: dependencies
dependencies: node_modules components

.PHONY: $(NODE_MODULES)
$(NODE_MODULES):
	$(NPM) install

.PHONY: $(COMPONENTS)
$(COMPONENTS):
	$(C8) install --dev

test: $(TESTS)

test-and-serve: test
	$(SERVE) -p 8888 test

.PHONY: $(TESTS)
$(TESTS): build
	$(C8) build --dev -o test/build -n $(shell basename $(@:.js=))

clean:
	$(RM) -rf $(BUILD)
	$(RM) -rf test/build

clean-dependencies:
	$(RM) -rf $(COMPONENTS)
	$(RM) -rf $(NODE_MODULES)