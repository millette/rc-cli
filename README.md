# radcan
[![Build Status](https://travis-ci.org/millette/rc-cli.svg?branch=master)](https://travis-ci.org/millette/rc-cli)
[![Coverage Status](https://coveralls.io/repos/github/millette/rc-cli/badge.svg?branch=master)](https://coveralls.io/github/millette/rc-cli?branch=master)
> Utility to download audio files from Radio-Canada

## Requirements
Node v8.12.0 or above is required, as is ffmpeg which should be in your $PATH.

## Install
```
$ npm install --global radcan
```

## Usage
Interactive

```sh
radcan https://ici.radio-canada.ca/premiere/premiereplus/science/p/49306/limprimante-3d-arrive-et-elle-va-changer-nos
```

Pick first (1)
```sh
radcan https://ici.radio-canada.ca/premiere/premiereplus/science/p/49306/limprimante-3d-arrive-et-elle-va-changer-nos --id 1
```

Files are download to the current directory. The audio files have the ```.aac``` extension and the metadata is found in ```.json``` files.

See ```radcan --help``` for more options.

## License
AGPL-v3 © 2018 [Robin Millette](http://robin.millette.info)
