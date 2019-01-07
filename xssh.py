from __future__ import print_function

import yaml
import argparse
import paramiko
import os

import deployment.k8sPaiLibrary.maintainlib.common as common




parser = argparse.ArgumentParser()

parser.add_argument('-p', '--path', required=True, help="cluster configuration's path")

args = parser.parse_args()
args.path = os.path.expanduser(args.path)
cluster_config = common.load_yaml_file(args.path)

for hosts_cfg in cluster_config["machine-list"]:
    if "machine-type" in hosts_cfg and hosts_cfg["machine-type"] == "GENERIC":
        # sftp your script to remote host with paramiko.

        if "sshport" not in hosts_cfg:
            hosts_cfg["sshport"] = cluster_config["default-machine-properties"]["sshport"]
        if "username" not in hosts_cfg:
            hosts_cfg["username"] = cluster_config["default-machine-properties"]["username"]
        if "password" not in hosts_cfg:
            hosts_cfg["password"] = cluster_config["default-machine-properties"]["password"]

        srcipt = "Azure-RDMA.sh"
        dst_remote = common.get_user_dir(hosts_cfg)
        if common.sftp_paramiko("./", dst_remote, srcipt, hosts_cfg) == False:
            print("failed")
            sys.exit(1)

        commandline = "sudo /bin/bash Azure-RDMA.sh"
        if common.ssh_shell_with_password_input_paramiko(hosts_cfg, commandline) == False:
            print("failed")
            sys.exit(1)



