prep:
	npm install
	wget https://firmware.bsn.cloud/cobra-standalone-npu_gaze-0.1.3-alpha.bsfw

build: 
	npm run build

publish: build
	rm -rf sd/*
	mkdir sd/dist
	cp -R dist/* sd/dist/
	cp src/autorun.brs sd/
	cp media/*mp4 sd/dist/
	cp *bsfw sd/
	tree sd/

clean:
	rm -rf sd/*
	rm -rf dist/*
	rm -rf node_modules
	rm -rf .DS_Store

