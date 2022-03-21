package com.elementarysoftware.vdcb.tree;

import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.Vector;

import org.eclipse.jface.viewers.ITreeContentProvider;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.prism.Batch;
import com.elementarysoftware.prism.DID;

import java.util.AbstractMap.SimpleEntry;

public class BatchCredentialsContentProvider implements ITreeContentProvider {

	@Override
	public Object[] getElements(Object inputElement) {
		DID did = (DID) inputElement;
		return did.getCredentialBatches();
	}

	@Override
	public Object[] getChildren(Object parentElement) {
		if (parentElement instanceof Batch) {
			return ((Batch)parentElement).getCredentials();
		} else {
			System.out.println("BatchCredentialsContentProvider: No getChildren() configured for "
					+ parentElement.getClass().toString());
		}

		return new Object[] {};
	}

	@Override
	public Object getParent(Object element) {
		System.out.println("getParent");
		return null;
	}

	@Override
	public boolean hasChildren(Object element) {
		Object[] obj = getChildren(element);
		return obj == null ? false : obj.length > 0;
	}

}
