#!/bin/bash

apt-get update -y
apt-get install -y libdapl2 libmlx4-1

sed -i "s/# OS.EnableRDMA=y/OS.EnableRDMA=y/g" /etc/waagent.conf
sed -i "s/# OS.UpdateRdmaDriver=y/OS.UpdateRdmaDriver=y/g" /etc/waagent.conf

if cat /etc/security/limits.conf | grep -qE '* hard  memlock  unlimited'; then
    echo "Configuration has been changed in /etc/security/limits.conf. Skip it"
else
    sed -i '/# End of file/i\* hard  memlock  unlimited' /etc/security/limits.conf
    sed -i '/# End of file/i\* soft  memlock  unlimited' /etc/security/limits.conf
fi

echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
