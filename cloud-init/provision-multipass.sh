#!/usr/bin/env bash
# =============================================================================
# Dog Breed Recognition — Multipass VM Provisioner
# =============================================================================
#
# FR: Lance une VM Ubuntu 24.04 avec Multipass et déploie l'application
#     Dog Breed Recognition derrière le serveur web Caddy.
#
# EN: Launches an Ubuntu 24.04 VM with Multipass and deploys the
#     Dog Breed Recognition app behind the Caddy web server.
#
# Prérequis / Prerequisites:
#   Multipass: https://multipass.run/install
#
# Usage:
#   ./cloud-init/provision-multipass.sh
# =============================================================================

set -euo pipefail

VM_NAME="dog-breed"
CLOUD_INIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/user-data-caddy.yaml"

echo "=== Dog Breed Recognition — VM Provisioning ==="
echo "VM Name   : ${VM_NAME}"
echo "Cloud-Init: ${CLOUD_INIT}"
echo ""

# --- Check Multipass is installed ---
if ! command -v multipass &>/dev/null; then
    echo "ERROR: multipass not found."
    echo "Install: https://multipass.run/install"
    exit 1
fi

# --- Launch VM ---
multipass launch 24.04 \
    --name "${VM_NAME}" \
    --cloud-init "${CLOUD_INIT}" \
    --cpus 2 \
    --memory 2G \
    --disk 10G

echo ""
echo "=== Verifying deployment... ==="

# --- Sentinel check ---
if multipass exec "${VM_NAME}" -- cat /etc/dog-breed-ready 2>/dev/null; then
    echo "✓ Cloud-init completed successfully."
else
    echo "⚠ Sentinel file not found. Cloud-init may still be running."
    echo "  Wait a moment, then: multipass exec ${VM_NAME} -- cat /etc/dog-breed-ready"
fi

# --- HTTP health check ---
if multipass exec "${VM_NAME}" -- curl -sf http://localhost/ | grep -q "Dog Breed Recognition"; then
    echo "✓ Caddy is serving the application."
else
    echo "⚠ HTTP health check failed. Caddy may still be starting."
    echo "  Check: multipass exec ${VM_NAME} -- systemctl status caddy"
fi

# --- Print connection info ---
VM_IP=$(multipass info "${VM_NAME}" --format json | jq -r ".info[\"${VM_NAME}\"].ipv4[0]")
echo ""
echo "=== VM ready! ==="
echo "URL    : http://${VM_IP}/"
echo "Shell  : multipass shell ${VM_NAME}"
echo "Cleanup: multipass delete ${VM_NAME} --purge"
