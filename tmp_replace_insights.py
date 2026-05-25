from pathlib import Path

path = Path(r'g:\agrify-connect-web\Mobile-Web-App-Startup-Project-Web\resources\js\Pages\Dashboard\AgrivetStoreInformation.jsx')
text = path.read_text(encoding='utf-8')
marker = "{activeTab === 'insights' && ("
start = text.index(marker)
end_marker = "\n                </div>\n              )}\n            </motion.div>"
end = text.index(end_marker, start) + len("\n                </div>\n              )}")
replacement = """{activeTab === 'insights' && (
                <div className="bg-white rounded-lg border border-[#E5E7EB] min-h-[600px]">
                  <div className="border-b border-[#E5E7EB] p-6">
                    <h2 className="text-xl font-bold text-[#102059]">Store Insights</h2>
                    <p className="text-sm text-[#65676B] mt-1">Analytics for orders, customers, and revenue</p>
                  </div>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-16 h-16 bg-[#E3F2FD] rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="w-8 h-8 text-[#244693]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#102059] mb-2">No insights available yet</h3>
                    <p className="text-sm text-[#65676B] text-center max-w-md">
                      Store analytics will appear here once there is enough order and customer activity data.
                    </p>
                  </div>
                </div>
              )}"""
new_text = text[:start] + replacement + text[end:]
path.write_text(new_text, encoding='utf-8')
print('Replaced', end - start, 'chars with', len(replacement))
