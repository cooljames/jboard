using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

namespace Jquant
{
    class Program
    {
        [DllImport("Kernel32")]
        private static extern bool SetConsoleCtrlHandler(EventHandler handler, bool add);

        private delegate bool EventHandler(CtrlType sig);
        private static EventHandler _handler;

        enum CtrlType
        {
            CTRL_C_EVENT = 0,
            CTRL_BREAK_EVENT = 1,
            CTRL_CLOSE_EVENT = 2,
            CTRL_LOGOFF_EVENT = 5,
            CTRL_SHUTDOWN_EVENT = 6
        }

        private static Process _childProcess;

        private static bool Handler(CtrlType sig)
        {
            CleanUp();
            return false;
        }

        private static void CleanUp()
        {
            try
            {
                if (_childProcess != null && !_childProcess.HasExited)
                {
                    Process p = Process.Start(new ProcessStartInfo
                    {
                        FileName = "taskkill",
                        Arguments = string.Format("/PID {0} /T /F", _childProcess.Id),
                        CreateNoWindow = true,
                        UseShellExecute = false
                    });
                    if (p != null)
                    {
                        p.WaitForExit(3000);
                    }
                }
            }
            catch { }
        }

        static int Main(string[] args)
        {
            try
            {
                Console.OutputEncoding = Encoding.UTF8;
                Console.Title = "Jquant ver 1.0 - 동적 퀀트 트레이딩 & AI 분석 통합 플랫폼";

                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                Directory.SetCurrentDirectory(baseDir);

                string runJsPath = Path.Combine(baseDir, "run.js");
                if (!File.Exists(runJsPath))
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("[ERROR] 실행에 필요한 run.js 파일을 찾을 수 없습니다: " + runJsPath);
                    Console.ResetColor();
                    Console.WriteLine("아무 키나 누르면 종료합니다...");
                    Console.ReadKey();
                    return 1;
                }

                _handler = new EventHandler(Handler);
                SetConsoleCtrlHandler(_handler, true);
                AppDomain.CurrentDomain.ProcessExit += delegate { CleanUp(); };

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "node",
                    Arguments = "\"" + runJsPath + "\"",
                    WorkingDirectory = baseDir,
                    UseShellExecute = false
                };

                _childProcess = Process.Start(psi);
                if (_childProcess == null)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("[ERROR] Node.js 실행에 실패했습니다. Node.js가 정상적으로 설치되어 있는지 확인해주세요.");
                    Console.ResetColor();
                    Console.WriteLine("아무 키나 누르면 종료합니다...");
                    Console.ReadKey();
                    return 1;
                }

                _childProcess.WaitForExit();
                return _childProcess.ExitCode;
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] 실행 중 오류가 발생했습니다: " + ex.Message);
                Console.ResetColor();
                Console.WriteLine("아무 키나 누르면 종료합니다...");
                Console.ReadKey();
                return 1;
            }
            finally
            {
                CleanUp();
            }
        }
    }
}
