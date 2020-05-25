# Copyright (c) Microsoft Corporation
# All rights reserved.
#
# MIT License
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
# documentation files (the "Software"), to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
# to permit persons to whom the Software is furnished to do so, subject to the following conditions:
# The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
# BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# This is a helper script to show all gcr repos used in kubespray.
# Reference: https://github.com/microsoft/pai/issues/4516

import yaml
import jinja2
import requests


def renderValue(value, renderedYaml):
    if isinstance(value, str):
        template = jinja2.Template(value)
        return template.render(renderedYaml)
    elif isinstance(value, list):
        return [renderValue(item, renderedYaml) for item in value]
    elif isinstance(value, dict):
        return {k: renderValue(v, renderedYaml) for k, v in value.items()}
    else:
        return value


def main():
    url = 'https://raw.githubusercontent.com/kubernetes-sigs/kubespray/release-2.11/roles/download/defaults/main.yml'
    yamlFile = requests.get(url).text
    originalYaml = yaml.load(yamlFile, yaml.FullLoader)
    renderedYaml = {}
    skipKeys = {'download_delegate'}
    for key in originalYaml:
        if key not in skipKeys:
            value = renderValue(originalYaml[key], renderedYaml)
            renderedYaml[key] = value
    for key in renderedYaml['downloads']:
        item = renderedYaml['downloads'][key]
        if 'container' in item and item['container'] is True:
            if 'gcr' in item['repo']:
                print('{}:{}'.format(item['repo'], item['tag']))


if __name__ == '__main__':
    main()
