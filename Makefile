PORT ?= 8000
HOST ?= 0.0.0.0
NODE ?= node

.PHONY: run test
run:
	PORT=$(PORT) HOST=$(HOST) $(NODE) scripts/serve.cjs

test:
	$(NODE) --test tests/*.test.cjs
