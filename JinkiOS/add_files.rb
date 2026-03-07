require 'xcodeproj'

project_path = 'jink/jink.xcodeproj'
project = Xcodeproj::Project.open(project_path)
target = project.targets.first

# Add GPSGridCacheService.swift
services_group = project.main_group.find_subpath(File.join('JinkApp', 'Services'), true)
cache_file = services_group.new_reference('GPSGridCacheService.swift')
target.source_build_phase.add_file_reference(cache_file)

# Add NotFoundView.swift and NotFoundViewModel.swift
scan_group = project.main_group.find_subpath(File.join('JinkApp', 'Features', 'Scan'), true)
nf_view_file = scan_group.new_reference('NotFoundView.swift')
target.source_build_phase.add_file_reference(nf_view_file)

nf_vm_file = scan_group.new_reference('NotFoundViewModel.swift')
target.source_build_phase.add_file_reference(nf_vm_file)

project.save
