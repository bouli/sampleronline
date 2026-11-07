PORT ?= 8000
HOST ?= 0.0.0.0

.PHONY: run
run:
	python3 -m http.server $(PORT) --bind $(HOST) --directory public
