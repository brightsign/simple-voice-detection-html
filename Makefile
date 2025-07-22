prep:
	npm install

build: 
	npm run build

publish: build
	rm -rf sd/*
	mkdir -p sd/dist
	cp -R dist/* sd/dist/
	cp src/autorun.brs sd/
	cp media/*mp4 sd/dist/
	tree sd/

clean:
	rm -rf sd/*
	rm -rf sd/
	rm -rf dist/*
	rm -rf dist/
	rm -rf node_modules
	rm -rf .DS_Store

