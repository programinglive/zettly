import unittest
from pathlib import Path


class BootstrapScriptTest(unittest.TestCase):
    def setUp(self):
        self.script_path = Path(__file__).resolve().parent / "bootstrap.sh"
        self.assertTrue(self.script_path.is_file(), "bootstrap.sh must exist")
        self.script_content = self.script_path.read_text(encoding="utf-8")

    def test_bootstrap_does_not_set_restrictive_global_umask_at_top(self):
        lines = [line.strip() for line in self.script_content.splitlines() if line.strip() and not line.strip().startswith("#")]
        # Global umask 077 at the start breaks standard permissions for global npm/binaries
        self.assertNotIn("umask 077", lines[:5], "Global umask 077 must not be set at the top of bootstrap.sh")

    def test_bootstrap_sets_standard_umask_for_toolchain_installation(self):
        self.assertIn("umask 022", self.script_content, "bootstrap.sh must ensure umask 022 for binary and library installation")

    def test_bootstrap_repairs_world_executable_permissions_on_local_binaries(self):
        self.assertIn(
            "chmod -R a+rX /usr/local/bin /usr/local/lib/node_modules /usr/local/n /usr/local/include /usr/local/share /opt/zettly-agent",
            self.script_content,
            "bootstrap.sh must repair world-readable/executable permissions for CLI tools and libraries",
        )

    def test_bootstrap_verifies_all_required_clis_run_as_worker_user_before_marking_success(self):
        self.assertIn("runuser -u zettly-agent -- ${cmd} --version", self.script_content)
        for cmd in ["node", "npm", "codex", "git", "gh", "php", "composer"]:
            self.assertIn(
                cmd,
                self.script_content,
                f"bootstrap.sh must verify that '{cmd}' executes successfully as the unprivileged zettly-agent user",
            )


if __name__ == "__main__":
    unittest.main()
