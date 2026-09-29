using System;
using System.Diagnostics;
using System.IO;
using System.Text;

namespace JquantInstall
{
    class Program
    {
        static int Main(string[] args)
        {
            try
            {
                Console.OutputEncoding = Encoding.UTF8;
                Console.Title = "Jquant ver 1.0 - 통합 설치 프로그램 (jquantinstall)";

                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                Directory.SetCurrentDirectory(baseDir);

                string batPath = Path.Combine(baseDir, "jquantinstall.bat");
                if (File.Exists(batPath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c \"" + batPath + "\"",
                        WorkingDirectory = baseDir,
                        UseShellExecute = false
                    };

                    Process proc = Process.Start(psi);
                    if (proc != null)
                    {
                        proc.WaitForExit();
                        return proc.ExitCode;
                    }
                }

                // Fallback direct execution if .bat is not found
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine("================================================================");
                Console.WriteLine("   🛠️ Jquant ver 1.0 - 통합 설치 프로그램 (jquantinstall)     ");
                Console.WriteLine("================================================================");
                Console.ResetColor();
                Console.WriteLine();
                Console.WriteLine("[1/3] npm 패키지 설치 진행 중...");

                Process npmProc = Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c npm install",
                    WorkingDirectory = baseDir,
                    UseShellExecute = false
                });
                if (npmProc != null) npmProc.WaitForExit();

                Console.WriteLine("[2/3] Python 패키지 설치 진행 중...");
                Process pipProc = Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c py -m pip install -r requirements.txt",
                    WorkingDirectory = baseDir,
                    UseShellExecute = false
                });
                if (pipProc != null) pipProc.WaitForExit();

                Console.WriteLine("[3/3] 환경설정 구성...");
                string envExample = Path.Combine(baseDir, ".env.local.example");
                string envTarget = Path.Combine(baseDir, ".env");
                if (!File.Exists(envTarget) && File.Exists(envExample))
                {
                    File.Copy(envExample, envTarget, false);
                }

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("\n🎉 Jquant 설치가 완료되었습니다!");
                Console.ResetColor();
                Console.WriteLine("Jquant.exe를 실행하여 프로그램을 시작하세요.");
                Console.WriteLine("계속하려면 아무 키나 누르세요...");
                Console.ReadKey();
                return 0;
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] 설치 중 오류 발생: " + ex.Message);
                Console.ResetColor();
                Console.WriteLine("계속하려면 아무 키나 누르세요...");
                Console.ReadKey();
                return 1;
            }
        }
    }
}
