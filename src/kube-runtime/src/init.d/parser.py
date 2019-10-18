#!/usr/bin/env python
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

from __future__ import print_function

import os
import sys
import collections
import logging
import argparse
import json
import yaml

logger = logging.getLogger(__name__)


def export(k, v):
    print("export {}='{}'".format(k, v))


def generate_runtime_env(framework):
    """Generate runtime env variables for tasks.

    # current
    PAI_HOST_IP_$taskRole_$taskIndex
    PAI_PORT_LIST_$taskRole_$taskIndex_$portType

    # backward compatibility
    PAI_CURRENT_CONTAINER_IP
    PAI_CURRENT_CONTAINER_PORT
    PAI_CONTAINER_HOST_IP
    PAI_CONTAINER_HOST_PORT
    PAI_CONTAINER_SSH_PORT
    PAI_CONTAINER_HOST_PORT_LIST
    PAI_CONTAINER_HOST_$portType_PORT_LIST
    PAI_TASK_ROLE_$taskRole_HOST_LIST
    PAI_$taskRole_$taskIndex_$portType_PORT

    # task role instances
    PAI_TASK_ROLE_INSTANCES

    Args:
        framework: Framework object generated by frameworkbarrier.
    """
    current_task_index = os.environ.get("FC_TASK_INDEX")
    current_taskrole_name = os.environ.get("FC_TASKROLE_NAME")

    taskroles = {}
    for taskrole in framework["spec"]["taskRoles"]:
        taskroles[taskrole["name"]] = {
            "number": taskrole["taskNumber"],
            "ports": json.loads(taskrole["task"]["pod"]["metadata"]["annotations"]["rest-server/port-scheduling-spec"]),
        }
    logger.info("task roles: {}".format(taskroles))

    taskrole_instances = []
    for taskrole in framework["status"]["attemptStatus"]["taskRoleStatuses"]:
        name = taskrole["name"]
        ports = taskroles[name]["ports"]

        host_list = []
        for task in taskrole["taskStatuses"]:
            index = task["index"]
            current_ip = task["attemptStatus"]["podHostIP"]

            taskrole_instances.append("{}:{}".format(name, index))

            def get_port_base(x):
                return int(ports[x]["start"]) + int(ports[x]["count"]) * int(index)

            # export ip/port for task role, current ip maybe None for non-gang-allocation
            if current_ip:
                export("PAI_HOST_IP_{}_{}".format(name, index), current_ip)
                host_list.append("{}:{}".format(current_ip, get_port_base("http")))

            for port in ports.keys():
                start, count = get_port_base(port), int(ports[port]["count"])
                current_port_str = ",".join(str(x) for x in range(start, start + count))
                export("PAI_PORT_LIST_{}_{}_{}".format(name, index, port), current_port_str)
                export("PAI_{}_{}_{}_PORT".format(name, index, port), current_port_str)

            # export ip/port for current container
            if (current_taskrole_name == name and current_task_index == str(index)):
                export("PAI_CURRENT_CONTAINER_IP", current_ip)
                export("PAI_CURRENT_CONTAINER_PORT", get_port_base("http"))
                export("PAI_CONTAINER_HOST_IP", current_ip)
                export("PAI_CONTAINER_HOST_PORT", get_port_base("http"))
                export("PAI_CONTAINER_SSH_PORT", get_port_base("ssh"))
                port_str = ""
                for port in ports.keys():
                    start, count = get_port_base(port), int(ports[port]["count"])
                    current_port_str = ",".join(str(x) for x in range(start, start + count))
                    export("PAI_CONTAINER_HOST_{}_PORT_LIST".format(port), current_port_str)
                    port_str += "{}:{};".format(port, current_port_str)
                export("PAI_CONTAINER_HOST_PORT_LIST", port_str)

        export("PAI_TASK_ROLE_{}_HOST_LIST".format(name), ",".join(host_list))
    export("PAI_TASK_ROLE_INSTANCES", ",".join(taskrole_instances))


def generate_jobconfig(framework):
    """Generate jobconfig from framework.

    Args:
        framework: Framework object generated by frameworkbarrier.
    """
    print(framework["metadata"]["annotations"]["config"])

if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s - %(levelname)s - %(filename)s:%(lineno)s - %(message)s",
        level=logging.INFO,
    )
    parser = argparse.ArgumentParser()
    parser.add_argument("function", choices=["genenv", "genconf"], help="parse function, could be genenv|genconf")
    parser.add_argument("framework_json", help="framework.json generated by frameworkbarrier")
    args = parser.parse_args()

    logger.info("loading json from %s", args.framework_json)
    with open(args.framework_json) as f:
        framework = json.load(f)

    if args.function == "genenv":
        generate_runtime_env(framework)
    elif args.function == 'genconf':
        generate_jobconfig(framework)